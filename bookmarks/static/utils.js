
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
        , headers: {    'Content-Type':     'application/json'
                      , 'X-Requested-With': 'XMLHttpRequest'
                      , 'X-CSRFToken':      crfs_token 
                   }
        , body: payload
    });
    return resp.json();
}

export async function ajax_get(url, crfs_token, data)
{

    var payload = JSON.stringify(data);

    const resp = await fetch(url, {
          method:  'GET'
        , headers: {    'Content-Type':     'application/json'
                      , 'X-Requested-With': 'XMLHttpRequest'
                      , 'X-CSRFToken':      crfs_token 
                   }});
    return resp.json();
}

/** Reload current page. (same as hit F5 in the web browser) */
export function dom_page_refresh()
{
    location.reload();
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

/* Insert HTML code fragment to some DOM element. 
 *  
 *  Usage example: 
 * 
 *     var anchor = document.querySelector("#element-dom-id");
 *     var div = dom_insert_html(anchor, `<div> <h1>Title</h1> <button>My button</button></div>`);   
 ******************************************************************/
export function dom_insert_html(anchor_element, html)
{
    var el = document.createElement("template");
    el.innerHTML = html.trim();
    var elem = el.content.firstChild;
    anchor_element.appendChild(elem);
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
