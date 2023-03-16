import { ILayoutRestorer, JupyterFrontEnd, JupyterFrontEndPlugin } from "@jupyterlab/application";
import { PageConfig } from '@jupyterlab/coreutils';
import { ILauncher } from "@jupyterlab/launcher";
import { ISettingRegistry } from "@jupyterlab/settingregistry";
import { ServerConnection } from '@jupyterlab/services';
import { ICommandPalette, showErrorMessage } from "@jupyterlab/apputils";
import { getServer, stopServer, getCateAppUrl, ServerStatus, setLabInfo } from './api';


const ERROR_BOX_TITLE = "Cate JupyterLab Extension";

async function activate(
    app: JupyterFrontEnd,
    settingRegistry: ISettingRegistry | null,
    palette: ICommandPalette | null,
    launcher: ILauncher | null,
    restorer: ILayoutRestorer | null
) {
    console.debug("Activating JupyterLab extension cate-jl-ext:");
    console.debug("  ISettingRegistry:", settingRegistry);
    console.debug("  ICommandPalette:", palette);
    console.debug("  ILauncher:", launcher);
    console.debug("  ILayoutRestorer:", restorer);
    console.debug("  baseUrl:", PageConfig.getBaseUrl());
    console.debug("  wsUrl:", PageConfig.getWsUrl());
    console.debug("  shareUrl:", PageConfig.getShareUrl());
    console.debug("  treeUrl:", PageConfig.getTreeUrl());

    const serverSettings = ServerConnection.makeSettings();
    // console.debug("  serverSettings:", serverSettings);

    let hasServerProxy: boolean = false;
    try {
        const labInfo = await setLabInfo(serverSettings);
        hasServerProxy = !!labInfo.has_proxy;
    } catch (error) {
        await showErrorMessage(ERROR_BOX_TITLE, error);
        return;
    }

    if (settingRegistry !== null) {
        let settings: ISettingRegistry.ISettings;
        try {
            settings = await settingRegistry.load(plugin.id);
            console.debug(
                "cate-jl-ext settings loaded:",
                settings.composite
            );
        } catch (error) {
            console.error(
                "Failed to load settings for cate-jl-ext.",
                error
            );
        }
    }


    // Add an application command
    const commandID = "cate:openCateApp";

    let cateAppWindow: Window | null = null;

    app.commands.addCommand(commandID, {
        label: "Cate App",
        iconClass: (args: any) => (args["isPalette"] ? "" : "cate-icon"),
        execute: async () => {

            let serverStatus: ServerStatus;
            try {
                // TODO (forman): show indicator while starting server
                console.debug("Starting (or getting) server...");
                serverStatus = await getServer(hasServerProxy, serverSettings)
            } catch (error) {
                console.error("Argh:", error);
                await showErrorMessage(ERROR_BOX_TITLE, error);
                return;
            }

            if (cateAppWindow !== null && !cateAppWindow.closed) {
                cateAppWindow.focus();
                return;
            }

            const serverUrl = serverStatus.url;
            const cateAppUrl = getCateAppUrl(serverUrl);

            console.debug(`Opening Cate App URL ${cateAppUrl}`);
            cateAppWindow = window.open(cateAppUrl, '_blank');
            if (cateAppWindow !== null) {
                cateAppWindow.onclose = () => {
                    stopServer(serverSettings).then(() => {
                        console.debug("Stopping server...");
                    });
                };
                cateAppWindow.focus();
            }
        }
    });

    if (palette !== null) {
        // Add the command to the palette.
        palette.addItem({
            command: commandID,
            category: "Other"
        });
    }

    if (launcher !== null) {
        // Add the command to the launcher.
        launcher.add({
            command: commandID,
            category: "Other",
            rank: 0
        });
    }

    console.log('JupyterLab extension cate-jl-ext is activated!');
}

/**
 * Initialization data for the cate-jl-ext extension.
 */
const plugin: JupyterFrontEndPlugin<void> = {
    id: "cate-jl-ext:plugin",
    autoStart: true,
    optional: [
        ISettingRegistry,
        ICommandPalette,
        ILauncher,
        ILayoutRestorer
    ],
    activate
};

export default plugin;



