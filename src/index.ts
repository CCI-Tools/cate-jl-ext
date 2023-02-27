import {
    JupyterFrontEnd,
    JupyterFrontEndPlugin
} from '@jupyterlab/application';

import { ISettingRegistry } from '@jupyterlab/settingregistry';

import { requestAPI } from './handler';

/**
 * Initialization data for the cate-jl-ext extension.
 */
const plugin: JupyterFrontEndPlugin<void> = {
    id: 'cate-jl-ext:plugin',
    autoStart: true,
    optional: [ISettingRegistry],
    activate: (app: JupyterFrontEnd, settingRegistry: ISettingRegistry | null) => {
        console.log('JupyterLab extension cate-jl-ext is activated!');

        if (settingRegistry) {
            settingRegistry
                .load(plugin.id)
                .then(settings => {
                    console.log('cate-jl-ext settings loaded:', settings.composite);
                })
                .catch(reason => {
                    console.error('Failed to load settings for cate-jl-ext.', reason);
                });
        }

        requestAPI<any>('get_example')
            .then(data => {
                console.log(data);
            })
            .catch(reason => {
                console.error(
                    `The cate_jl_ext server extension appears to be missing.\n${reason}`
                );
            });
    }
};

export default plugin;
