
/** @brief Performs Http POST request to some endpoint. 
 *  @param {string} url         - Http request (REST API) endpoint 
 *  @param {string} crfs_token  - Django CRFSS token from global variable (generated_token)
 *  @param {object} data        - HTTP request body, aka payload  
 */
export  async function ajax_post(url, crfs_token, data)
{

    var payload = JSON.stringify(data);

    const resp = await fetch(url, {
          method:  'POST'
        , credentials:  "same-origin"
        , headers: {    'Content-Type':     'application/json'
                      , 'X-Requested-With': 'XMLHttpRequest'
                      , 'X-CSRFToken':       crfs_token 
                      ,  dataType:          'json'
                   }
        , body: payload
    });
    console.log(" [TRACE] ajax_post = ", resp);
    return resp;
}

export async function ajax_get(url, crfs_token)
{

    const resp = await fetch(url, {
          method:  'GET'
        , credentials: "same-origin"
        , headers: {    'Content-Type':     'application/json'
                      , 'X-Requested-With': 'XMLHttpRequest'
                      , 'X-CSRFToken':      crfs_token 
                   }});
    return resp.json();
}

// Http method for creating new resource
export const HTTP_POST   = "POST";
// Http method for updating an existing resource  
export const HTTP_PUT    = "PUT";
// Http method for getting a resource             
export const HTTP_GET    = "GET";
// Http method for deleting a resource 
export const HTTP_DELETE = "DELETE";
// Http method for updating/changing a resource 
export const HTTP_PATCH = "PATCH";

export async function ajax_request(url, crfs_token, method, data =  null)
{
    let params = {
        method:        method 
      , headers: {    'Content-Type':     'application/json'
                    , 'X-Requested-With': 'XMLHttpRequest'
                    , 'X-CSRFToken':      crfs_token 
                 }
    };

    if(data != null){ 
      params["body"] = JSON.stringify(data); 
    }

    const resp = await fetch(url, params);
    return resp; 
}

/** Event fired after content is loaded. */
export function dom_onContentLoaded(callback)
{
    document.addEventListener("DOMContentLoaded", callback);
}

/** Reload current page. (same as hit F5 in the web browser) */
export function dom_page_refresh()
{
    document.location.reload(true);
}

/** Redirect URL */
export function dom_redirect_url(url)
{
    document.location.href = url;
}

/** Wrapper function to document.querySelectorAll, but returns array instead of NodeList. 
 * 
 */
export function dom_querySelectorAll(css_selector, dom_node = null)
{
    var node  = document;
    if(dom_node != null){ node = dom_node; }
    return Array.prototype.slice.call(node.querySelectorAll(css_selector));
}

export function dom_onClicked(css_selector, callback)
{
    var elem = document.querySelector(css_selector);

    if(!elem) { 
        console.warn(` dom_onClicked() => CSS selector ${css_selector} not found.`); 
    }
    if(elem){        
        elem.addEventListener("click", callback);
    }
}

/* Append HTML code fragment to some DOM element. 
 *  
 *  Usage example: 
 * 
 *     var anchor = document.querySelector("#element-dom-id");
 *     var div = dom_append_html(anchor, `<div> <h1>Title</h1> <button>My button</button></div>`);   
 ******************************************************************/
export function dom_append_html(anchor_element, html)
{
    var el = document.createElement("template");
    el.innerHTML = html.trim();
    var elem = el.content.firstChild;
    anchor_element.appendChild(elem);
    return elem;
}

/**  Insert html fragment as first child of some DOM element.
 * 
 */
export function dom_insert_html(anchor_element, html)
{
    var el = document.createElement("template");
    el.innerHTML = html.trim();
    var elem = el.content.firstChild;
    anchor_element.insertBefore(elem, anchor_element.childNodes[0]);
    return elem;
}

export function dom_insert_html_at_selector(selector, html)
{
    var el = document.createElement("template");
    el.innerHTML = html.trim();
    var elem = el.content.firstChild;

    var anchor_element = document.querySelector(selector);
    anchor_element.appendChild(elem);
    return elem;
}
