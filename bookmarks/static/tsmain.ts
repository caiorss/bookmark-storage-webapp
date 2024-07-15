
import * as tsutils from "./tsutils.js";
import { HttpMethod, dom, EventManager} from "./tsutils.js";

import { Dialog_Basic, Dialog2_Prompt, Dialog_YesNo
      , DialogForm, Dialog_Notify, Dialog_Datalist_Prompt
        } from "./dialogs.js";

declare function Toastify(obj: any);
    
function toastNotification(message: string): Promise<void>
{
    // Delay in milliseconds 
    const delayMs = 2000;
    Toastify({ text: message, duration: delayMs }).showToast();
    return new Promise( resolve => setTimeout(resolve, delayMs) );
}

// Boolean flag ('true' or 'false') stored in html5
// local storage API. It is useful for storing non critical 
// user preference data on client-side. 
export 
class LocalStorageFlag {
   
    name: string;
    
    constructor(name: string, value: Boolean) 
    {
        this.name = name;    
        
        var q = localStorage.getItem(name);
        
        if (q == null || q == "undefined") 
        {
            localStorage.setItem(name, String(value) );
        }
    }

    set(value){ localStorage.setItem(this.name, value); }

    get(){
        var result = localStorage.getItem(this.name);
        if (result == "undefined") {
            this.set(false);
            return false;
        }
        return JSON.parse(result) || false;
    };

    toggle(){ this.set(!this.get()); return this.get(); };

};


export class ObservervableLocalStorageFlag {
    name: string;
    observers: Array<(arg0: boolean) => void> = [];

    constructor(name: string, value: Boolean = false)
    {
        this.name = name;
        // console.log(" [TRACE] Created Ok. ");
        let q = localStorage.getItem(name);
       
        if (q == null || q == "undefined") 
        {
            localStorage.setItem(name, String(value) );
        }

        document.addEventListener("DOMContentLoaded", () => {
            this.notifyObservers();
        });
    }

    set(value)
    { 
        if(value == this.get()){ return; }
        localStorage.setItem(this.name, value);
        this.notifyObservers(); 
    }

    get(){
        var result = localStorage.getItem(this.name);
        if (result == "undefined") {
            this.set(false);
            return false;
        }
        return JSON.parse(result) || false;
    };

    toggle(){ this.set(!this.get()); return this.get(); };

    notifyObservers(){
        let flag = this.get();
        for(let obs of this.observers){ obs(flag); }
    }

    addObserver(obs)
    {
        this.observers.push(obs);
    }

    addLoggerObserver(){
        this.observers.push(x => {
            console.log(` [EVENT] Observable local storage '${this.name}' flag changed to  ${x}`)
        });
    }

    // 2 way data binding with an html input element, such as checkbox.
    bindElement(selector: string)
    {

        document.addEventListener("DOMContentLoaded", () => {
            let elem: HTMLInputElement = document.querySelector(selector);
            elem.addEventListener("change", () => {
                this.set(elem.checked);
            });

            this.addObserver((flag: boolean) => {
                elem.checked = flag;
            });

            this.notifyObservers();
        });

   }
};

export 
class LocalStorageString {

    name: string; 

    constructor(name: string, value: string = null) 
    {
        this.name = name;

        var q = localStorage.getItem(name);
        if (q == null || q == "undefined") {
            localStorage.setItem(name, value);
        }
   }

    get(default_value: string = null)
    {
        var result = localStorage.getItem(this.name);
        if (result == "undefined") {
            this.set(default_value);
            return default_value;
     }
     return result;
    }
    
    set(value: string){ localStorage.setItem(this.name, value); } 
 
};

let site_theme = new LocalStorageString("site_theme");


function set_theme(mode)
{
    var root = document.documentElement;

    if(mode == "dark_mode")
    {           
        root.style.setProperty("--main-background-color", "#3c3c3c");
        root.style.setProperty("--foreground-color",      "white");
        root.style.setProperty("--item-background-color", "#2f2f2f");
        root.style.setProperty("--hyperlink-color",       "lightskyblue");
        
        root.style.setProperty("--right-row-label-color", "black");
        root.style.setProperty("--left-row-label-color", "#1b1b1b");

        root.style.setProperty("--btn-primary-bgcolor", "#007bff");
    }

    if(mode == "light_mode")
    {
        root.style.setProperty("--main-background-color", "lightgray");
        root.style.setProperty("--foreground-color",      "black");
        root.style.setProperty("--item-background-color", "ligthblue");
        root.style.setProperty("--hyperlink-color",       "darkblue");
        
        root.style.setProperty("--right-row-label-color", "#bdb3b3");
        root.style.setProperty("--left-row-label-color", "#82c5bc");

        root.style.setProperty("--btn-primary-bgcolor", "black");
    }
}


function selection_changed()
{
    console.log(" [TRACE] Theme changed Ok. \n");
    //  var mode = this.value;
    set_theme(this.value);
    site_theme.set(this.value);
}




dom.event_onContentLoaded(() =>
 {
    console.trace(" [TRACE] I was loaded from tsmain.ts - typescript file. ");
 
    var theme_selection_box: HTMLSelectElement = document.querySelector("#theme-selector-box");
    theme_selection_box.onchange = selection_changed;

    var theme = site_theme.get("dark_mode");
    set_theme(theme);

    if(theme == "dark_mode") theme_selection_box.selectedIndex = 0;
    if(theme == "light_mode") theme_selection_box.selectedIndex = 1;

    /*
    dom.event_onClicked("#btn-create-new-collection", () => {
        collection_create_new();
        console.log(" I was clicked OK. ");
    });
    */


 });

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

    if( resp.is_status_success() )
    {
        await toastNotification("Item renamed Ok.");
        //let r = await Dialog_Notify.notify("OK", "Item renamed Ok.", 1500);
        dom.page_refresh(); 
    } else {
        // await Dialog_Notify.notify("Error notification", "Error: " + data, 1500);
        await toastNotification("Error: " + data);
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
    if( resp.is_status_success() ) 
    {
        // await Dialog_Notify.notify("OK", "Toggle starred settings Ok.", 500);
        await toastNotification("Toggle starred settings. Ok.");
        dom.page_refresh();
    } else {
        Dialog_Notify.notify("ERROR", "Error: failed to set item as starred.");
    }    

}

// Utility function for debugging
export async function api_item_print(item_id)
{
    var token = window["generated_token"];
    let item = await tsutils.ajax_get("/api2/items/" + item_id, token);
    console.log(" [TRACE] item = ");
    console.table( item );
}




// ========= Tags / T A G S ===============================//


async function tag_create()
{
    let tag_name = await Dialog2_Prompt.prompt("Enter new tag name:");
    if(tag_name == "") return;
    let token = window["generated_token"];
    
    let payload = { name: tag_name, description: "" };
    let resp = await tsutils.ajax_request(HttpMethod.HTTP_POST, "/api/tags", token, payload);
    
    if(resp["result"] == "OK")
    {
        await Dialog_Notify.notify_ok(resp["message"]);
        dom.page_refresh();
    } else {
        await Dialog_Notify.notify_error(resp["message"]);
    }
}

export 
async function tag_add(item_id: Number)
{
    let last_input = new LocalStorageString("tag-last-input", "");
        
    let dlg = new Dialog_Datalist_Prompt();
    dlg.setTitle("Select a tag");    
    
    dlg.setInputText(last_input.get());
    // dlg.setInputText("");

    // Returns a list of tags [ { id: "tag id", name: "name", description: "Tag description"} ]
    let token = window["generated_token"];
    let resp_: tsutils.HttpRestResult = await tsutils.ajax_get("/api/tags", token);
    // console.log(all_tags);
    
    let data = await resp_.json();

    for(let n in data)
    {
        let row = data[n]; 
        console.log(" row = ", row);
        console.log(` name = ${row[name]} - id = ${row["id"]}`)
        dlg.add_option(row["name"], row["id"]);
    }
    
    // Returns an object like: {  value: "Selected-value-from-list-box", key: 12515 }
    let answer = await dlg.prompt_selected();
    console.log(" ANSWER = ", answer);

    var resp = null;
    last_input.set(answer["value"]);

    if(answer["key"] == null)
    {  
        console.trace(" Create new TAG:");
        // Create  new tag            
        let payload = {   action:   "add_item_new_tag"
                        , tag_name:  answer["value"]
                        , item_id:   item_id 
                      };
        console.log(" Payload = ", payload);        
        resp = await tsutils.ajax_request(HttpMethod.HTTP_PUT, "/api/tags", token, payload);

    // Add a new item to a given tag 
    } else {
        let payload = {   action: "add_item"
                        , tag_id:  answer["key"]
                        , item_id: item_id 
        };
        console.log(" Payload = ", payload);
        resp = await tsutils.ajax_request(HttpMethod.HTTP_PUT ,"/api/tags", token, payload);

    }

    console.log(" Resp = ", resp);

    if( resp.is_status_success() )
    {
        // await Dialog_Notify.notify_ok("Tag added successfully. Ok.", 500);
        toastNotification("Tag added successfully. Ok.");
        dom.page_refresh();
    } else {
        // await Dialog_Notify.notify_error(resp["message"], 500);
        toastNotification("Error: " + resp["message"]);
    }

}

/** Delete tag from bookmark */ 
export 
async function tag_delete_from_item(tag_id: Number, bookmark_id: Number)
{    
    let payload = {   action:   "remove_tag_item"
                    , tag_id:    tag_id
                    , item_id:  bookmark_id
                };
    console.log(" Payload = ", payload);
    let token = window["generated_token"];
    let resp = await tsutils.ajax_request(HttpMethod.HTTP_PUT, "/api/tags", token, payload);

    if( resp.is_status_success() ) 
    {
        // await Dialog_Notify.notify_ok("Tag removed from item. Ok.", 1000);
        toastNotification("Tag removed from item. Ok.");
        dom.page_refresh(); 
    } else {
        // await Dialog_Notify.notify_error(" [FAILURE] " + resp["message"], 1000);
        toastNotification("Error: " + resp["message"]);

    }
}

export 
async function tag_delete(tag_name: string, tag_id: Number)
{
    let answer = await Dialog_YesNo.prompt(
                    "Delete tag."
                , `Are you sure you want to delete this tag: '${tag_name}'. 
                   Note: This action is irreversible. ` );

    if(!answer) { return; }

    let resp = await tsutils.ajax_request( 
                               HttpMethod.HTTP_PUT
                            , "/api/tags"
                            , window["generated_token"]
                            , { 
                                  "tag_name": tag_name 
                                , "tag_id":   tag_id
                                , "action":   "delete_tag"
                                });


    if( resp.is_status_success() )
    { 
        // Dialog_Notify.notify("Information", "Tag deleted. Ok.")
        toastNotification("Tag deleted Ok.");
        dom.page_refresh();
    } else {
        // Dialog_Notify.notify("Error:", "Failed to delete tag.");                  
        toastNotification( "Error: Failed to delete tag.");
    }
}

export 
async function tag_update(tag_name: string, tag_id: Number, tag_desc: string)
{
    let dialog = new DialogForm();
    //dialog_collection_edit.detach_on_close(false);
    dialog.setTitle("Update tag");
    dialog.setText("Enter the following informations:");
    
    let entry_name = dialog.add_row_input("name", "Tag Name:");
    let entry_desc  = dialog.add_row_input("desc", "Tag Description:");

    entry_name.value = tag_name;
    entry_desc.value = tag_desc;
    
    // Wait user fill the dialog form information. 
    let sender = await dialog.onConfirm();

    let resp = await tsutils.ajax_request(
                               HttpMethod.HTTP_PUT
                            , "/api/tags"
                            , window["generated_token"]
                            , { 
                                  "action":         "update_tag"
                                , "tag_name":        entry_name.value 
                                , "tag_desc":        entry_desc.value 
                                , "tag_id":          tag_id
                                });

    if( resp.is_status_success() )
    { 
        // Dialog_Notify.notify("Information", "Tag changed. Ok.")
        toastNotification("Tag updated Ok.");
        dom.page_refresh();
    } else {
        // Dialog_Notify.notify("Error:", "Failed to change tag.");                  
        toastNotification("Failed to update tag.");
    }    

}

export 
async function tag_filter_window()
{
    let dlg = new Dialog_Datalist_Prompt();
    dlg.setTitle("Select a tag");    
    // dlg.setInputText(last_input.get());

    // Returns a list of tags [ { id: "tag id", name: "name", description: "Tag description"} ]
    let token = window["generated_token"];
    let resp = await tsutils.ajax_get("/api/tags", token);
    let tags = await resp.json(); 
    
    for(let n in tags)
    {
        let row = tags[n];
        // console.log(" row = ", row);
        // console.log(` name = ${row[name]} - id = ${row["id"]}`)
        dlg.add_option(row["name"], row["id"]);
    }    

    // Returns an object like: {  value: "Selected-value-from-list-box", key: 12515 }
    let answer = await dlg.prompt_selected();
    console.log(" ANSWER = ", answer);

    if(answer == null){ return; }

    // Redirect URL 
    dom.url_redirect( `/items?filter=tag-name&A0=${answer["value"]}` );
}

/** @description Add new bookmark to collection  */
export 
async function api_item_add(crfs_token: string)
{
    let url = await Dialog2_Prompt.prompt("Enter the new URL to be added", "");
    console.log("User entered the URL: ", url);

    var query_params = new URLSearchParams(window.location.search);

    if (query_params.get("filter") == "collection") 
    {
        console.trace(" [TRACE] Add item to collection")

        var collection_id = query_params.get("A0");
        var payload1 = { url: url, action: "item_new", collection_id: collection_id };

        var token = window["generated_token"];

        let res = await tsutils.ajax_post("/api/collections/add_item", token, payload1);

        if( res.is_status_success() ) 
        {
            // let r = await Dialog_Notify.notify("Notification", "Bookmark added successfuly.", 2000);
            await toastNotification("Bookmark added successfuly.");
            dom.page_refresh();
        } else if( res.is_domain_error() )
        {
            let msg = await res.json();
            // await Dialog_Notify.notify("Error notification", msg["error"], 3000);
            toastNotification("ERROR: Item with this URL already exists.")
            console.error("Error: bookmark already exists");
            // document.location.href = `/items?filter=search&query=${url}`;
        }

        return;
    }

    let starred = query_params.get("filter") == "starred";
    // var payload = {url: url, action: "item_new", starred: starred};
    let payload: any = { url: url, starred: starred };

    console.log(" [TRACE] Payload = ", payload);

    let res = await tsutils.ajax_post("/api2/items", crfs_token, payload);
    let body = await res.json();
    console.log(" Status /api2/items = ", res);

    if( res.is_status_success() )
    { 
        // Dialog_Notify.notify("INFO", "Bookmark added successfuly", 2000);
        toastNotification( "Bookmark added successfuly");
        location.reload();
    } else if( res.is_domain_error() )
    {
        // Dialog_Notify.notify("Error notification", body["error"], 2000);
        await toastNotification("Error: " + body["error"]);

        document.location.href = `/items?filter=search&query=${url}`;
        console.trace(" [ERROR] Failed to send data.");
    }

}

export 
async function item_delete(flag: boolean, item_id: Number, item_title: string) 
{
    
    let dialog_title = flag ? "Permanently delete item (Irreversible)." : "Delete item (move to trash)";

    let response = await Dialog_YesNo.prompt( dialog_title
                                      , "Are you sure you want to delete item: " + item_title);

    if(!response) return;
    let mode = flag ? "hard" : "soft";
    let payload = { id: item_id, mode: mode };    
    let token = window["generated_token"];
    let resp = await tsutils.ajax_request(HttpMethod.HTTP_DELETE, "/api/items", token, payload);

    if( resp.is_status_success() )
    {
       // let r = await Dialog_Notify.notify("User Notification", "Item Deleted Ok.", 500);
       toastNotification( "Item Deleted Ok.");
       dom.page_refresh();
    } else {
        // Dialog_Notify.notify("ERROR", "Error: failed to delete item.");
        toastNotification( "Error: failed to delete item.");
    }    
}

// Upload file to server. 
export 
async function item_upload_file() 
{
    let file_dlg: HTMLInputElement = document.querySelector("#file-choose");
    let file = file_dlg.files[0];
    // console.trace(" [TRACE] Entered function item_upload_file() ");

    let form = new FormData();
    form.append("upload-file", file);
    console.log(form);
    var token = window["generated_token"];

    let res = await fetch("/api/item_upload", {
           method: 'POST'
         , headers: {    // 'Content-Type':     'multipart/form-data'
                         'X-Requested-With': 'XMLHttpRequest'
                       , 'X-CSRFToken':       token 
                    }          
        , body:    form 
    });

    // console.log(res);
    if(res.status == 200 || res.status == 201)
    {
         // Show dialog and block for 1.5 seconds (15000 milliseconds.)
         // await Dialog_Notify.notify("Information", "Upload successful.", 1500);
         toastNotification( "Upload successful.");
         dom.page_refresh();
    } else {
         // await Dialog_Notify.notify("Error", "Upload failure.", 1500);
         toastNotification( "Upload failure.");
    }
    // dom.page_refresh();
}


// Download file from URL storing a file snapshot on the server. 
// It is useful for storing PDF and DOCX and documents on server-side.  
export
async function item_snapshot(item_id: Number)
{
    let dlg = new Dialog_Notify();
    dlg.setTitle("Download");
    dlg.setText("Downloading file snapshot. Wait a while ...");
    dlg.show();

    let token = window["generated_token"];
    let payload = { action: "snapshot", id: item_id };
    let resp = await tsutils.ajax_request(HttpMethod.HTTP_PUT, "/api/items", token, payload);
    
    if( resp.is_status_success() )
    {
        await Dialog_Notify.notify_ok("Download successful Ok.");
        dlg.close();
        dom.page_refresh(); 
    } else {
        await Dialog_Notify.notify_error( resp["message"] );
        dlg.close();
    }
}

export async function item_snapshot_delete(item_id: Number)
{
    let answer = await Dialog_YesNo.prompt(
          "Delete snapshot file."
        , `Are you sure you want to delete this snapshot file:` 
    );

    if (!answer) { return; }

    let token = window["generated_token"];
    let payload = { action: "snapshot-delete", id: item_id };
    let resp = await tsutils.ajax_request(HttpMethod.HTTP_PUT, "/api/items", token, payload); 
 
    if (resp.is_status_success()) {
        // Dialog_Notify.notify("Information", "Snapshot file deleted successfully. Ok.")
        toastNotification( "Snapshot file deleted successfully. Ok.");
        
        dom.page_refresh();
    } else {
        // Dialog_Notify.notify("Error:", "Failed to delete file snapshot.");
        toastNotification("Failed to delete file snapshot.");
    }

}


export 
function search_bookmarks()
{    
    //console.trace(" [TRACE] I was called. ");
    let search_box    = <HTMLInputElement> document.querySelector("#search-entry");
    let query         = encodeURIComponent(search_box.value); 
    let mode_selector = <HTMLInputElement> document.querySelector("#search-mode-selector");
    let mode          = mode_selector ? mode_selector.value : "AND";
    let url           = `/items?filter=search&query=${query}&mode=${mode}`;    
    //console.log("URL = ", url);
    // Redirect to search route.
   dom.url_redirect(url); 

}

export 
function clear_entry_field(dom_element_id: string)
{
    let field: HTMLInputElement = document.querySelector(dom_element_id);
    console.assert(field != null, `Cannot find entry field to be cleared`);
    field.value = "";
    field.focus();
}


export
async function related_item_add(item_id: Number)
{
    let related_id = await Dialog2_Prompt.prompt("Enter related item id:", "");                            
    let token = window["generated_token"];
    let payload = { item_id: item_id, related_ids: [ related_id ] };
    let res = await tsutils.ajax_post("/api/related", token, payload);
    console.log(res);
    dom.page_refresh();    
}


export 
function toggle_sidebar()
{
    var s = dom.select(".sidebar");
    dom.toggle(s);
}

export 
function toggle_items_table_info(table_info_id: string)
{
    // alert("Button toggle clicked ok.");
    let obs = document.querySelector(table_info_id);
    if(obs == null){ alert(`Error: object #${table_info_id} not found. `); }
    // console.assert(obs, "Table info supposed not null.");
    dom.toggle(obs); 
}

export 
function toggle_action_menu(actionID)
{
    var elem = document.querySelector(actionID);
    dom.toggle(elem);
}

export 
function open_url_newtab(url: string)
{
   dom.url_newtab(url); 
}

let dialog_collection_edit = new DialogForm();
dialog_collection_edit.detach_on_close(false);
dialog_collection_edit.setTitle("Create new collection");
dialog_collection_edit.setText("Enter the following informations:");
dialog_collection_edit.add_row_input("title", "Title:");
dialog_collection_edit.add_row_input("desc", "Description:");


async function collection_create_new() 
{
    // alert(" Clicked at create new collection Ok. ");
    // dialog_collection_edit.show();

    let sender = await dialog_collection_edit.onConfirm();
    let title = sender.get_widget("title").value;
    let desc = sender.get_widget("desc").value;

    console.log(" [INFO] Creating collection with title = ", title);

    let res = await tsutils.ajax_request(
                                  HttpMethod.HTTP_POST    
                                , "/api/collections"
                                , window["generated_token"]
                                , {
                                      title:       title
                                    , description: desc
                                });

    if (res["result"] == "OK") 
    {
        // let r = await Dialog_Notify.notify("Information", "Collection created. Ok.", 500);
        toastNotification( "Collection created. Ok.");
        dom.page_refresh();
    } else {
        // Dialog_Notify.notify("Error", "Failed to create collection.");
        toastNotification( "Failed to create collection.");
    }

    // dialog.close();
}



async function collection_edit(collection_id, collection_title) 
{
    dialog_collection_edit.setTitle("Edit Collection");
    // alert(" Clicked at create new collection Ok. ");
    dialog_collection_edit.show();

    let entry_title = dialog_collection_edit.get_widget("title");
    entry_title.value = collection_title;

    let sender = await dialog_collection_edit.onConfirm();
    let title  = sender.get_widget("title").value;

    console.log(" Collection title = ", title);

    //let desc  = sender.get_widget("desc").value;

    console.log(" [INFO] Creating collection with title = ", title);

    let res = await tsutils.ajax_request( HttpMethod.HTTP_PUT  
                                         , "/api/collections"
                                         , window["generated_token"]
                                         , {
                                             id:    collection_id
                                            , title: title 
                                            //, description: desc 
                                        });

    if( res.is_status_success() )
    {
        // Dialog_Notify.notify("Bookmark added successfuly");
        toastNotification("Bookmark added successfuly");
        location.reload();
    } else {

        // Dialog_Notify.notify("Error notification"
        //                     ,"Error: bookmark already exists"
        //                     , 3000);
        toastNotification("Error: bookmark already exists");
    }
}

async function collection_delete(collection_id, collection_title)
{
    let answer = await Dialog_YesNo.prompt(
                    "Delete collection."
                , `Are you sure you want to delete the collection: '${collection_title}' ` );

    if(!answer) { return; }

    let resp = await tsutils.ajax_request(
                              HttpMethod.HTTP_DELETE
                            , "/api/collections"
                            , window["generated_token"]
                            , { "collection_id": collection_id });


    if( resp.is_status_success() ) 
    { 
        // Dialog_Notify.notify("Information", "Collection deleted. Ok.")
        toastNotification( "Collection deleted. Ok.");
        dom.page_refresh();
    } else {
        // Dialog_Notify.notify("Error:", "Failed to delete collection.");                  
        toastNotification( "Failed to delete collection.");
    }
};




// How can add or update a query string parameter.
// Reference: https://stackoverflow.com/questions/5999118
function UpdateQueryString(key, value, url) {
    if (!url) url = window.location.href;
    var re = new RegExp("([?&])" + key + "=.*?(&|#|$)(.*)", "gi"),
        hash;

    if (re.test(url)) {
        if (typeof value !== 'undefined' && value !== null) {
            return url.replace(re, '$1' + key + "=" + value + '$2$3');
        } 
        else {
            hash = url.split('#');
            url = hash[0].replace(re, '$1$3').replace(/(&|\?)$/, '');
            if (typeof hash[1] !== 'undefined' && hash[1] !== null) {
                url += '#' + hash[1];
            }
            return url;
        }
    }
    else {
        if (typeof value !== 'undefined' && value !== null) {
            var separator = url.indexOf('?') !== -1 ? '&' : '?';
            hash = url.split('#');
            url = hash[0] + separator + key + '=' + value;
            if (typeof hash[1] !== 'undefined' && hash[1] !== null) {
                url += '#' + hash[1];
            }
            return url;
        }
        else {
            return url;
        }
    }
}

function bookmarks_order_by(order)
{
    var url = document.location.href;
    document.location.href = UpdateQueryString("order", order, url);

}
// window["bookmarks_order_by"] = bookmarks_order_by;


export let flag_details = new ObservervableLocalStorageFlag("details-opened", false);
flag_details.addLoggerObserver();
flag_details.bindElement("#checkbox-toggle-details");

flag_details.addObserver((flag: Boolean) => {
    dom.selectAll(".details-item")
       .forEach( (elem: any) => elem.open = flag );
});


export function toggle_details()
{
    dom.selectAll(".details-item").forEach( (elem: any) => elem.open = !elem.open );
}


    // ================== Events Setup =================== // 
    //                                                     // 
    
let event_manager = new EventManager();

// ----- Events for template file: include_menu.html --------// 
// ----------------------------------------------------------// 
event_manager.event_onClick("#btn-top-clear",      () =>  clear_entry_field("#search-entry") );
event_manager.event_onClick("#btn-file-upload",    item_upload_file);
event_manager.event_onClick("#btn-search",         search_bookmarks);
event_manager.event_onClick("#btn-tag-filter",     tag_filter_window );

event_manager.event_onClick("#btn-table-add-bookmark", () => 
    {
        console.log("Clicked at button btn-table-add-bookmark");
        let token = window["generated_token"];
        api_item_add(token);
    });

event_manager.event_onHitReturn( "#search-entry" , search_bookmarks ); 


// ----- Events for template file: bookmark_list.html -------// 
// ----------------------------------------------------------//

event_manager.event_onClick("#btn-order-newest", () => {
   bookmarks_order_by("new"); 
});

event_manager.event_onClick("#btn-order-oldest", () => {
   bookmarks_order_by("old"); 
});

event_manager.event_onClick("#btn-order-updated", () => {
   bookmarks_order_by("updated"); 
});

event_manager.event_onClickMany(".btn-toggle-action-table", function(){
    let div1 =  this.closest(".div-item-container")
    let div2 =  div1.querySelector(".action-menu-table");
    // console.log(" [TRACE] Action tagle toggled = ", div2);
    dom.toggle(div2);
});


event_manager.event_onClickMany(".btn-toggle-details", function(){
    let div1 =  this.closest(".div-item-container")
    let div2 =  div1.querySelector(".item-table-info");
    // console.log(" [TRACE] Action tagle toggled = ", div2);
    dom.toggle(div2);
});

event_manager.event_onClickMany(".btn-bookmark-rename", function(){
    let div   = this.closest(".div-item-container");
    let id    = div.getAttribute("data-id");
    let title = div.getAttribute("data-title");
    // let brief = div.getAttribute("data-brief");
    item_quick_rename(id, title);
});

event_manager.event_onClickMany(".btn-bookmark-open-domain", function(){
    let div = this.closest(".div-item-container");
    let hostname = div.getAttribute("data-hostname");
    open_url_newtab(`http://${hostname}`); 
});

event_manager.event_onClickMany(".btn-bookmark-tag-add", function(){
    let div = this.closest(".div-item-container");
    let  item_id = div.getAttribute("data-id");
    // javascript:tsmain.tag_add( {{ bookmark.id }} );" 
    console.log(" [TRACE] Item_id = ", item_id);
    tag_add(item_id);
});

event_manager.event_onClickMany(".btn-snapshot-delete", function(){
    let div = this.closest(".div-item-container");
    let item_id = div.getAttribute("data-id");
    console.log(" [TRACE] item_id = ", item_id);
    item_snapshot_delete(item_id);
});



event_manager.event_onClickMany(".btn-bookmark-add-related", function(){
    let div = this.closest(".div-item-container");
    let item_id = div.getAttribute("data-id");
    related_item_add(item_id); 
    
});

// Edit tag of current bookmark 
event_manager.event_onClickMany(".btn-bookmark-tag-edit", function(){
        let id = this.getAttribute("data-id");
        let name = this.getAttribute("data-name");
        let desc = this.getAttribute("data-description");
        tag_update(name, id, desc);
});

// Remove tag from bookmark 
event_manager.event_onClickMany(".btn-bookmark-tag-delete", function(){
        let item_id = this.getAttribute("data-bookmark-id");
        let tag_id  = this.getAttribute("data-tag-id");
        tag_delete_from_item(tag_id, item_id);
});


// ---- Events for template file: 'tags_list.html' ----------//
// ----------------------------------------------------------//               

// Event installed on button for updating and editing tags. 
event_manager.event_onClickMany(".btn-tag-update", function() 
    {
        let elem = this;
            // console.log(" Element = ", elem);
        // Html5 custom attribute 
        let tag_id   = elem.getAttribute("data-id");
        let tag_name = elem.getAttribute("data-name");
        let tag_desc = elem.getAttribute("data-description");
        tag_update(tag_name, tag_id, tag_desc );

    });
         
// onclick="tsmain.tag_delete( '{{ tag.name | escapejs }}', {{ tag.id }} )" 

event_manager.event_onClickMany(".btn-tag-delete", function() 
    {
        let elem = this;
            // console.log(" Element = ", elem);
        // Html5 custom attribute 
        let tag_id   = elem.getAttribute("data-id");
        let tag_name = elem.getAttribute("data-name");
        tag_delete(tag_name, tag_id );

    });


// ---- Events for template file: 'collection_list.html' ----------//
// ----------------------------------------------------------------//               

event_manager.event_onClickMany(".btn-collection-edit", function(){
    let div   = this.closest(".div-collection-container");
    let id    = div.getAttribute("data-id");
    let title = div.getAttribute("data-title");
    collection_edit(id, title);
});

event_manager.event_onClickMany(".btn-collection-delete", function(){
    let div   = this.closest(".div-collection-container");
    let id    = div.getAttribute("data-id");
    let title = div.getAttribute("data-title"); 
    collection_delete(id, title);
    // href="javascript:tsmain.collection_delete({{collection.id}}, '{{ collection.title }}' )"  
    // href="javascript:tsmain.collection_edit({{collection.id}}, '{{ collection.title }}' )"  
});

