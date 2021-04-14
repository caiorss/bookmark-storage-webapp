
import * as tsutils from "./tsutils.js";
import { HttpMethod } from "./tsutils.js";

import { Dialog_Basic, Dialog2_Prompt, Dialog_YesNo
      , DialogForm, Dialog_Notify, Dialog_Datalist_Prompt
        } from "./dialogs.js";

namespace dom {

    // Select DOM element by CSS selector 
    function select(selector: string) 
    {
        return document.querySelector(selector)
    }
    
    // Toggle DOM element 
    function toggle(m: HTMLElement) {
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

    function event_onClicked(selector: string, callback) 
    {
        var elem = document.querySelector(selector);

        if (!elem) {
            console.warn(` dom_onClicked() => CSS selector ${selector} not found.`);
        }
        if (elem) {
            elem.addEventListener("click", callback);
        }
    }
 

    /** Reload current page. (same as hit F5 in the web browser) */
    export function page_refresh()
    {
        document.location.reload(true);
    }

    /** Redirect URL */
    export function redirect_url(url) 
    {
        document.location.href = url;
    }

  

} // End of namespace 


export 
async function item_quick_rename(item_id: Number, old_item_title: string)
{
    let new_item_title: string = await Dialog2_Prompt.prompt("Change item title:", "", old_item_title);

    console.log(` [TRACE] User provided title := ${new_item_title} ; id = ${item_id} `);

    var payload = { title: new_item_title};    
    var token = window["generated_token"];
    
    let resp = await tsutils.ajax_request(tsutils.HttpMethod.HTTP_PATCH, `/api2/items/${item_id}`, token, payload);
    
    // .ajax_request('/api2/items/' + item_id, token, "PATCH", payload)
    let data = await resp.json();
    if(resp.status == 200 || resp.status == 201){
        let r = await Dialog_Notify.notify("OK", "Item renamed Ok.", 1500);
        dom.page_refresh(); 
    } else {
        Dialog_Notify.notify("ERROR", "Error: " + data, 1500);
    }    

}


export 
async function item_set_starred(checkbox)
{
    let item_id = checkbox.getAttribute("value");
    console.log(" [TRACE] item_set_starred() => Item_ID: ", item_id);

    var payload = { starred: checkbox.checked };    
    var token = window["generated_token"];
    // let resp = await utils.ajax_request("/api2/items/" + item_id, token, utils.HTTP_PATCH, payload)
    let resp = await tsutils.ajax_request(HttpMethod.HTTP_PATCH, `/api2/items/${item_id}`, token, payload);
    if(resp.status == 200 || resp.status == 201){
        await Dialog_Notify.notify("OK", "Toggle starred settings Ok.", 500);
        dom.page_refresh();
    } else {
        Dialog_Notify.notify("ERROR", "Error: failed to set item as starred.");
    }    

}



// window["item_quick_rename"] = item_quick_rename;


