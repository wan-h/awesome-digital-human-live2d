import 'whatwg-fetch';

const HOST = SERVER_HOST || "localhost";
const PORT = SERVER_PORT || 8080;
const VERSION = SERVER_VERSION || "v0";
const URL = "http://" + HOST + ":" + PORT;


export async function common_heatbeat_api() {
    let response = await fetch(URL + `/common/${VERSION}/heartbeat`, {
        method: "GET"
    });
    return response.json();
}

export async function agent_infer_api(mode: string, text: string, character: string) {
    let response = await fetch(URL + `/agent/${VERSION}/infer`, {
        method: "POST",
        body: JSON.stringify(
            {
                engine: mode,
                data: text, 
                format: "text", 
                character: character
            }
        ),
        headers: {
            'Content-Type': 'application/json'
        }
    });
    return await response.json();
}