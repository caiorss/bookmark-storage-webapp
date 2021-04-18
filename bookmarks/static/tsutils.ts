
// ------------ Utitlity functions for DOM manipulation -----------------//
export namespace dom {

    // Select DOM element by CSS selector 
    export function select(selector: string) 
    {
        return document.querySelector(selector)
    }
    
    // Toggle DOM element 
    export function toggle(m: any) {
        if (m == null) { alert(" Error: element not found"); }
        var d = m.style.display;
        var v = window.getComputedStyle(m);

        // if(m.style.visibility == "" || m.style.visibility == "visible")
        if (v.visibility == "visible") {
            console.log(" [TRACE] => Hide element");
            m.style.visibility = "hidden";
            m.style.display = "none";
        } else {
            console.log(" [TRACE] => Show element");
            m.style.visibility = "visible";
            m.style.display = "block";
        }
    } /* -- End of - DOM_toggle() --- */

    export function event_onClicked(selector: string, callback) 
    {
        var elem = document.querySelector(selector);

        if (!elem) {
            console.warn(` dom_onClicked() => CSS selector ${selector} not found.`);
        }
        if (elem) {
            elem.addEventListener("click", callback);
        }
    }

    /** Event fired after content is loaded. */
    export function event_onContentLoaded(callback) 
    {
        document.addEventListener("DOMContentLoaded", callback);
    }

    /** Reload current page. (same as hit F5 in the web browser) */
    export function page_refresh()
    {
        document.location.reload(true);
    }

    /** Redirect URL */
    export function url_redirect(url: string) 
    {
        document.location.href = url;
    }

    export  function url_newtab(url: string)
    {
       var win = window.open(url, '_blank');
       win.focus();
    }



} // End of namespace 



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


export class HttpRestResult 
{
    resp: Response = null;

    constructor(resp: Response)
    {
        this.resp = resp;
    }

    /// Returns true is the status code is 200 or 201 
    is_status_success(): Boolean 
    {
        return this.resp.status == 200 || this.resp.status == 201;
    }

    status(): Number 
    {
        return this.resp.status;
    }

    async json(): Promise<any> {
        let data = await this.resp.json();
        return data;
    } 
};

export async function ajax_request(method: HttpMethod, url: string
    , crfs_token: string, data: any = null): Promise<HttpRestResult> {
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
    return new HttpRestResult(resp);
}



/** @brief Performs Http POST request to some endpoint. 
 *  @param {string} url         - Http request (REST API) endpoint 
 *  @param {string} crfs_token  - Django CRFSS token from global variable (generated_token)
 *  @param {object} data        - HTTP request body, aka payload  
 */
export async function ajax_post(  url: string
                                , crfs_token: string
                                , data: any): Promise<HttpRestResult> {

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
    return new HttpRestResult(resp);
}

export async function ajax_get(url: string, crfs_token: string): Promise<HttpRestResult> 
{

    const resp = await fetch(url, {
        method: 'GET'
        , credentials: "same-origin"
        , headers: {
            'Content-Type': 'application/json'
            , 'X-Requested-With': 'XMLHttpRequest'
            , 'X-CSRFToken': crfs_token
        }
    });
    // return resp.json();
    return new HttpRestResult(resp);  
}




// } // ---- End of tsmain namespace -----// 