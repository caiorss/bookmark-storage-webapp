
import * as tsutils from "./tsutils.js";
import { HttpMethod, dom} from "./tsutils.js";

import { Dialog_Basic, Dialog2_Prompt, Dialog_YesNo
      , DialogForm, Dialog_Notify, Dialog_Datalist_Prompt
        } from "./dialogs.js";



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

    if (res["result"] == "OK") {
        let r = await Dialog_Notify.notify("Information", "Collection created. Ok.", 500);
        dom.page_refresh();
    } else {
        Dialog_Notify.notify("Error", "Failed to create collection.");
    }

    // dialog.close();
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


    dom.event_onClicked("#btn-create-new-collection", () => {
        collection_create_new();
        console.log(" I was clicked OK. ");
    });



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
    if( resp.is_status_success() ){
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
    if( resp.is_status_success() ) 
    {
        await Dialog_Notify.notify("OK", "Toggle starred settings Ok.", 500);
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
        await Dialog_Notify.notify_ok("Tag added successfully. Ok.", 500);
        dom.page_refresh();
    } else {
        await Dialog_Notify.notify_error(resp["message"], 500);
    }

}


export 
async function tag_remove(tag_id: Number, bookmark_id: Number)
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
        await Dialog_Notify.notify_ok(resp["message"], 500);
        dom.page_refresh(); 
    } else {
        await Dialog_Notify.notify_error(resp["message"], 500);
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
        Dialog_Notify.notify("Information", "Tag deleted. Ok.")
        dom.page_refresh();
    } else {
        Dialog_Notify.notify("Error:", "Failed to delete tag.");                  
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
        Dialog_Notify.notify("Information", "Tag changed. Ok.")
        dom.page_refresh();
    } else {
        Dialog_Notify.notify("Error:", "Failed to change tag.");                  
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
            let r = await Dialog_Notify.notify("INFORMATION", "Bookmark added successfuly.", 2000);
            dom.page_refresh();
        } else if( res.is_domain_error() )
        {
            let msg = await res.json();
            Dialog_Notify.notify("Error", msg["error"], 2000);

            console.error("Error: bookmark already exists");
            document.location.href = `/items?filter=search&query=${url}`;
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
        Dialog_Notify.notify("INFO", "Bookmark added successfuly", 2000);
        location.reload();
    } else if( res.is_domain_error() )
    {
        Dialog_Notify.notify("Domain Error", body["error"], 2000);
        // document.location.href = `/items?filter=search&query=${url}`;
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

    if(resp["result"] == "OK"){
        let r = await Dialog_Notify.notify("OK", "Item Deleted Ok.", 500);
        dom.page_refresh();
    } else {
        Dialog_Notify.notify("ERROR", "Error: failed to rename item.");
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
         await Dialog_Notify.notify("Information", "Upload successful.", 1500);
         dom.page_refresh();
    } else {
         await Dialog_Notify.notify("Error", "Upload failure.", 1500);
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
        await Dialog_Notify.notify_ok(resp["message"]);
        dlg.close();
        dom.page_refresh(); 
    } else {
        await Dialog_Notify.notify_error(resp["message"]);
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
        Dialog_Notify.notify("Information", "Tag deleted. Ok.")
        dom.page_refresh();
    } else {
        Dialog_Notify.notify("Error:", "Failed to delete tag.");
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
