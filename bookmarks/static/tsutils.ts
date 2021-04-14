
export enum HttpMethod {

    // Http method for creating new resource
    HTTP_POST = "POST"
    // Http method for updating an existing resource  
    , HTTP_PUT = "PUT"
    // Http method for getting a resource             
    , HTTP_GET = "GET"
    // Http method for deleting a resource 
    , HTTP_DELETE = "DELETE"
    // Http method for updating/changing a resource 
    , HTTP_PATCH = "PATCH"
};


export async function ajax_request(method: HttpMethod, url: string
    , crfs_token: string, data: any = null) {
    let params = {
        method: method
        , headers: {
            'Content-Type': 'application/json'
            , 'X-Requested-With': 'XMLHttpRequest'
            , 'X-CSRFToken': crfs_token
        }
    };

    if (data != null) {
        params["body"] = JSON.stringify(data);
    }

    const resp = await fetch(url, params);
    return resp;
}



/** @brief Performs Http POST request to some endpoint. 
 *  @param {string} url         - Http request (REST API) endpoint 
 *  @param {string} crfs_token  - Django CRFSS token from global variable (generated_token)
 *  @param {object} data        - HTTP request body, aka payload  
 */
export async function ajax_post(url: string, crfs_token: string, data: JSON) {

    var payload = JSON.stringify(data);

    const resp = await fetch(url, {
        method: 'POST'
        , credentials: "same-origin"
        , headers: {
            'Content-Type': 'application/json'
            , 'X-Requested-With': 'XMLHttpRequest'
            , 'X-CSRFToken': crfs_token
            , dataType: 'json'
        }
        , body: payload
    });
    console.log(" [TRACE] ajax_post = ", resp);
    return resp;
}

export async function ajax_get(url: string, crfs_token: string) {

    const resp = await fetch(url, {
        method: 'GET'
        , credentials: "same-origin"
        , headers: {
            'Content-Type': 'application/json'
            , 'X-Requested-With': 'XMLHttpRequest'
            , 'X-CSRFToken': crfs_token
        }
    });
    return resp.json();
}

// } // ---- End of tsmain namespace -----// 