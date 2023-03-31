import { URLExt } from '@jupyterlab/coreutils';
import { ServerConnection } from '@jupyterlab/services';
import { callUntil, UnrecoverableError } from "./util";

const API_NAMESPACE = "cate";

export interface LabInfo {
    lab_url: string;
    has_proxy?: boolean;
}

export interface ServerState {
    port: number;
    pid: number;
    status: string;
    cmdline: string[];
    name: string | null;
    username: string | null;
    returncode: number | null;
    stdout: string | null;
    stderr: string | null;
}

export interface ServerStatus {
    url: string;
    state: ServerState;
    response: any;
}

export function getCateAppUrl(serviceUrl: string) {
    return `${serviceUrl}/app/?serviceUrl=${serviceUrl}`;
}

/**
 * Set lab information.
 */
export async function setLabInfo(settings: ServerConnection.ISettings): Promise<LabInfo> {
    const request = {
        method: "PUT",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            lab_url: settings.baseUrl
        })
    };
    return callAPI<LabInfo>('labinfo', request, settings);
}

/**
 * Start Cate server and return, once it is ready to serve.
 */
export async function getServer(hasServerProxy: boolean,
                                settings: ServerConnection.ISettings): Promise<ServerStatus> {
    const serverState = await startServer(settings);
    assertServerStateOk(serverState);

    const serverPort = serverState.port;
    const serverUrl = (hasServerProxy
                       && settings.baseUrl.indexOf("localhost") == -1
                       && settings.baseUrl.indexOf("127.0.0.1") == -1)
        ? `${settings.baseUrl}proxy/${serverPort}`
        : `http://localhost:${serverPort}`;

    const fetchServerInfo = async (): Promise<any> => {
        const serverState = await getServerState();
        assertServerStateOk(serverState);
        const response = await fetch(serverUrl);
        if (!response.ok) {
            throw new ServerConnection.ResponseError(response);
        }
        return response.json();
    }

    console.debug('Trying to connect to', serverUrl);
    const serverResponse = await callUntil(fetchServerInfo, 10000, 10);
    console.debug('Cate server response:', serverResponse);

    return {
        url: serverUrl,
        state: serverState,
        response: serverResponse,
    };
}


function assertServerStateOk(serverState: ServerState) {
    console.debug("cate-jl-ext server state:", serverState);
    if (serverState.status === "running") {
        return;  // Ok!
    }
    if (serverState.status === "sleeping"
        || serverState.status === "disk-sleep") {
        console.warn("Cate server in sleeping state:", serverState);
        return;  // Ok!
    }
    let message = "Cate server could not be started or terminated unexpectedly. ";
    if (typeof serverState.stderr === "string") {
        message += `Message: ${serverState.stderr}. `;
    }
    if (typeof serverState.returncode === "number") {
        message += `Exit code ${serverState.returncode}. `;
    }
    // noinspection SuspiciousTypeOfGuard
    if (typeof serverState.status === "string") {
        message += `Status: ${serverState.status}. `;
    }
    if (Array.isArray(serverState.cmdline)) {
        message += `Command-line: "${serverState.cmdline.join(" ")}". `;
    }
    throw new UnrecoverableError(message);
}


/**
 * Start Cate server.
 */
async function startServer(settings?: ServerConnection.ISettings): Promise<ServerState> {
    return callAPI<ServerState>('server', {method: "PUT"}, settings);
}

/**
 * Get Cate server state.
 */
async function getServerState(settings?: ServerConnection.ISettings): Promise<ServerState> {
    return callAPI<ServerState>('server', {method: "GET"}, settings);
}


/**
 * Call the API extension
 *
 * @param endPoint API REST end point for the extension
 * @param init Initial values for the request
 * @param settings Server connection settings
 * @returns The response body interpreted as JSON
 */
export async function callAPI<T>(
    endPoint = '',
    init: RequestInit = {},
    settings?: ServerConnection.ISettings
): Promise<T> {
    settings = settings || ServerConnection.makeSettings();

    const requestUrl = URLExt.join(settings.baseUrl, API_NAMESPACE, endPoint);

    let response: Response;
    try {
        response = await ServerConnection.makeRequest(requestUrl, init, settings);
    } catch (error) {
        throw new ServerConnection.NetworkError(error);
    }

    let data: any = await response.text();
    if (data.length > 0) {
        try {
            data = JSON.parse(data);
        } catch (error) {
            console.warn('Not a JSON response body.', response);
        }
    }

    if (!response.ok) {
        throw new ServerConnection.ResponseError(response, data.message || data);
    }

    return data;
}
