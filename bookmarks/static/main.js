import { Dialog_Basic, Dialog2_Prompt, Dialog_YesNo
      , DialogForm, Dialog_Notify, Dialog_Datalist_Prompt
        } from "/static/dialogs.js";

import * as utils from "/static/utils.js";


function DOM_select(selector)
{
    return document.querySelector(selector);
}

// Toggle DOM element 
function DOM_toggle(m)
{
    if(m == null){ alert(" Error: element not found");  }
    var d = m.style.display;
    var v = window.getComputedStyle(m);

    // if(m.style.visibility == "" || m.style.visibility == "visible")
    if(v.visibility == "visible")
    {
        console.log(" [TRACE] => Hide element");
        m.style.visibility = "hidden";
        m.style.display = "none";
    } else {
        console.log(" [TRACE] => Show element");
        m.style.visibility = "visible";
        m.style.display = "block";
    }        
} /* -- End of - DOM_toggle() --- */


// Set visibility of DOM element 
function DOM_set_visibility(m, flag)
{
    if(m == null){ alert(" Error: element not found");  }
    var d = m.style.display;
    var v = window.getComputedStyle(m);
    // if(m.style.visibility == "" || m.style.visibility == "visible")
    if(flag == true)
    {
        console.log(" [TRACE] => Hide element");
        m.style.visibility = "hidden";
        m.style.display = "none";
    } else {
        console.log(" [TRACE] => Show element");
        m.style.visibility = "visible";
        m.style.display = "block";
    }        
} /* -- End of - DOM_toggle() --- */


// Boolean flag ('true' or 'false') stored in html5
// local storage API. It is useful for storing non critical 
// user preference data on client-side. 
class LocalStorageFlag {
    constructor(name, value) {
        this.name = name;
        this._dummy = (function () {
            var q = localStorage.getItem(name);
            if (q == null || q == "undefined") {
                localStorage.setItem(name, value);
            }
        } ());
        this.get = () => {
            var result = localStorage.getItem(this.name);
            if (result == "undefined") {
                this.set(false);
                return false;
            }
            return JSON.parse(result) || false;
        };
        this.set = (value) => localStorage.setItem(this.name, value);
        this.toggle = () => { this.set(!this.get()); return this.get(); };
    }
}
;



class LocalStorageString {
    constructor(name, value) {
        this.name = name;
        this._dummy = (function () {
            var q = localStorage.getItem(name);
            if (q == null || q == "undefined") {
                localStorage.setItem(name, value);
            }
        } ());
        this.get = (default_value) => {
            var result = localStorage.getItem(this.name);
            if (result == "undefined") {
                this.set(default_value);
                return default_value;
            }
            return result;
        };
        this.set = (value) => localStorage.setItem(this.name, value);
    }
}
;



// ---- Executed after document (DOM objects) is loaded ---------- //

let flagItemDetailsVisible = new LocalStorageFlag("itemsTableVisible", true);


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


let site_theme = new LocalStorageString("site_theme");

function selection_changed(mode)
{
    var mode = this.value;
    set_theme(mode);
    site_theme.set(mode);
}


const ACTION_RESTORE     = "RESTORE";
const ACTION_DELETE      = "DELETE";
const ACTION_ADD_STARRED = "ADD_STARRED";
const ACTION_REM_STARRED = "REM_STARRED";

function get_selected_items_for_bulk_operation()
{
    // Get ID of selected bookmarks 
    return utils.dom_querySelectorAll(".bulk-checkbox")
                            .filter(x => x.checked)
                            .map(x => parseInt(x.id));
}

async function ajax_perform_bulk_operation(action)
{
    var crfs_token = window["generated_token"];
    console.log(" [TRACE] Current token = ", crfs_token);

    var selected_items = get_selected_items_for_bulk_operation();
    
    console.log(" selected items = ", selected_items);

    var payload = {                  
        action:   action 
      , items:    selected_items
    };

    var resp = await utils.ajax_post("/api/bulk", crfs_token, payload);
    console.log("Response = ",  resp);

    //return resp;
    // Reload current page 
    location.reload();
}


//----------------------------------------------//
//    D I A L O G S                             // 
//----------------------------------------------//


class Dialog_Search_Item extends Dialog_Basic
{
    constructor()
    {
        super()
        // this.attachShadow( { mode: 'open' } )

        this.setTitle("Search bookmarks");
        this.setText("");

        this.detach_on_close(false);

        var x = this.insertBodyHtml(`
                    <div>
                        <span>Search bookmark:</span>
                        </br>
                        <input id="input-search"> </input>
                        </br>
                        <button id="btn-search">Search</button>
                        <button id="btn-clean">Clean</button>

                        <button id="btn-prev" title="Previous results"> <<= </button>
                        <button id="btn-next" title="Next results"> =>> </button>

                        <br>
                        <span id="search-result-info"></span>

                        <div id="div-search-results">
                        </div>
                    </div>`);

        this.setCustomStyle(`
            #div-search-results {
                overflow-y: scroll;
                background-color: gray;
                max-height:  350px;
                height: 350px;
            }

            .div-row-result {
                background-color: cyan;
                padding: 10px;
                border: 10px;
                border-radius: 20px;
            }
        `); 

        this.page  = 1;

/*         this.onClose(() => {
            this.reset()
            console.log(" [INFO] Window closed ok. ");
        }); */

        this.input_search = x.querySelector("#input-search");
        this.btn_search = x.querySelector("#btn-search");
        this.div_search_results = x.querySelector("#div-search-results");
        this.label = x.querySelector("#search-result-info");


        x.querySelector("#btn-clean").addEventListener("click", () => this.reset());

        x.querySelector("#btn-prev").addEventListener("click", () => {
            this.page = this.page - 1;
            if(this.page < 1){ this.page = 1;}
            this.search_items();
        });

        x.querySelector("#btn-next").addEventListener("click", () => {
            this.page = this.page + 1;
            this.search_items();
        });

        this.btn_search.addEventListener("click", () => {
            let query = this.input_search.value.trim();
            if(query == "") return;
            console.log(" Searching data. OK. ", query);
            this.search_items();
        })

        this.setSubmitCallback((flag) => {
          if(!flag){ return};
          this.add_items_to_collection() 
        }); 

        console.log(" [TRACE] x = ", x);
    }

    async add_items_to_collection()
    {
        console.trace(" [onSubmit()] Called Ok. ");

        // Get IDs from bookmark items selected (where checkbox is checked).
        var checked_items_id = utils.dom_querySelectorAll(".bookmark-checkbox", this.div_search_results)
                                  .filter(x => x.checked )
                                  .map( x => parseInt(x.value) );

        if(checked_items_id.length == 0){ return; }

        console.log(" [TRACE] checked_items_id = ", checked_items_id);

        var query_params = new URLSearchParams(window.location.search);
        if(query_params.get("filter") != "collection"){ return; }
        var collectionID = query_params.get("A0");

        var token = window["generated_token"];
        const ACTION_COLLECTION_ADD = "ADD";

        var payload = {
            items:        checked_items_id
           ,collectionID: collectionID
           ,action:       ACTION_COLLECTION_ADD
       };

       let res = await utils.ajax_post("/api/collections/items", token, payload);
       console.log(" [TRACE] respose OK = ", res);
       utils.dom_page_refresh();

    }

    get_query()
    {
        return this.input_search.value.trim();
    }

    reset() {
        console.log(" [TRACE] Dialog_Search_Item.reset() called. Ok ");
        this.input_search.value = "";
        this.label.textContent = "Found: ";
        this.div_search_results.innerHTML = "";
    }

    async search_items()
    {
        var query_params = new URLSearchParams(window.location.search);
        if(query_params.get("filter") != "collection"){ return; }
        var collectionID = query_params.get("A0");

        var query = this.input_search.value.trim();
        var encoded_query = encodeURIComponent(query);

        if(query == "") return;

        console.log(" Encoded query = ", encoded_query);
        let q = await utils.ajax_get(`/api/search?query=${encoded_query}&page=${this.page}&coll=${collectionID}`);
        console.log(q);
        let data = q["data"];
        console.log(" data = ", data);

        this.div_search_results.innerHTML = "";

        this.label.textContent = `Found: ${q["total"]} results / page: ${this.page}`

        data.map( row => {
            let id    = row["id"];
            let title = row["title"];
            let url   = row["url"];

            utils.dom_append_html(this.div_search_results,
                `<div class="div-row-result">
                    <li>
                        <input type="checkbox" class="bookmark-checkbox" value="${id}" />
                        <a target="_blank" href="${url}">[${id}] ${title}</a>
                    </li>
                </div>
                `);
        });
    }

} /* --- End of class - Dialog_Search_Item ------ */

customElements.define('dialog-search-item', Dialog_Search_Item);
window["Dialog_Search_Item"] = Dialog_Search_Item;


var dialog_search_item = new Dialog_Search_Item();
window["dialog_search_item"] = dialog_search_item;




// Callback executed after DOM is fully loaded
utils.dom_onContentLoaded(() => {

    // ----------- Attach modal dialogs to body --------------------// 
    dialog_search_item.attach_body();
    
    // ---------- DOM html modifications ------------------//

    var query_params = new URLSearchParams(window.location.search);
    
    if(query_params.get("filter") == "collection")
    { 
        var btn_add_items = utils.dom_insert_html_at_selector("#div-additional-buttons", `
        <a  class="btn-sm btn-primary"  href="#" title="Search items win">Add multiple items</a>
        `);

        btn_add_items.addEventListener("click", () => dialog_search_item.show());         

        var btn_add_items = utils.dom_insert_html_at_selector("#div-additional-buttons", `
            <a id="btn-experimental" class="btn-sm btn-primary" 
                href="/collection/list" title="Search items win">View all collections</a>
        `);

        let collectionID = query_params.get("A0");

        utils.dom_querySelectorAll(".action-menu-table").forEach( x => {
            let itemID = x.getAttribute("value");
            console.assert(itemID, "Not supposed to be null");
            utils.dom_append_html(x, `
               <th>
                    <a  class="btn-sm btn-info" 
                        href  = "javascript:collection_remove_item(${collectionID}, ${itemID})" 
                        title = "Remove item from collection."
                    >
                        Remove from collection
                    </a>        
                </th>
            `);
        });

    }

    console.trace(" [TRACE] Starting DOM initialization. OK. ");

    // ---------- Event handlers ----------------------------------// 

    // dialog_notify.notify("Page created Ok", 900);

    var flag = flagItemDetailsVisible.get();
    var obs = document.querySelectorAll(".item-details");
    obs.forEach(x => DOM_set_visibility(x, flag));    
    

    var theme_selection_box = document.querySelector("#theme-selector-box");
    theme_selection_box.onchange = selection_changed;

    var theme = site_theme.get("dark_mode");
    set_theme(theme);

    if(theme == "dark_mode") theme_selection_box.selectedIndex = 0;
    if(theme == "light_mode") theme_selection_box.selectedIndex = 1;

    var body = document.body;

    var dialog = utils.dom_append_html(body, `
        <dialog class="dialog-bulk-action"> 
            <div>
                <button id="btn-bulk-add-starred"> Add items to starred items</button> 
                </br> 
                <button id="btn-bulk-rem-starred"> Remove items from starred items</button> 
                </br> 
                <button id="btn-bulk-delete">  Delete items</button>          
                </br> 
                <button id="btn-bulk-restore"> Restore items</button>         
                </br>             
                <button id="btn-bulk-add-to-collection">Add items to collection</button>         
                <select id="selector-collection-add">
                    <option value="-1">New collection</option>
                </select>
            </div>
            <button id="btn-dialog-close">Close</button> 
        </dialog>
    `.trim());

    var btn = dialog.querySelector("#btn-dialog-close");
    btn.addEventListener("click", () => dialog.close() );

    utils.dom_onClicked("#btn-bulk-actions",     () => dialog.showModal() );
    utils.dom_onClicked("#btn-bulk-add-starred", () => ajax_perform_bulk_operation(ACTION_ADD_STARRED) );
    utils.dom_onClicked("#btn-bulk-rem-starred", () => ajax_perform_bulk_operation(ACTION_REM_STARRED) );
    utils.dom_onClicked("#btn-bulk-delete",      () => ajax_perform_bulk_operation(ACTION_DELETE) );
    utils.dom_onClicked("#btn-bulk-restore",     () => ajax_perform_bulk_operation(ACTION_RESTORE) );

    var selectbox  = dialog.querySelector("#selector-collection-add");
    var crfs_token = window["generated_token"];
    
    // Fill selection box with all user collections 
    utils.ajax_get("/api/collections", crfs_token).then( colls => {
        for(let n  in colls){
            var opt   = document.createElement("option");
            // console.log(" row = ", colls[n]);
            opt.text  = colls[n]["title"];
            opt.value = colls[n]["id"];
            selectbox.add(opt, -1);    
        }
        
        console.log(" [TRACE] collections = ", colls);
    });

    const ACTION_COLLECTION_ADD = "ADD";
    const ACTION_COLLECTION_NEW = "NEW";
    
    utils.dom_onClicked("#btn-bulk-add-to-collection", () => {
        var items = get_selected_items_for_bulk_operation();
        var selectionbox = document.querySelector("#selector-collection-add");
        var collectionID = selectionbox[selectionbox.selectedIndex]["value"];

        console.log(" items = ", items);
        console.log(" collection = ", collectionID);

        var payload = {
             items:        items
            ,collectionID: collectionID
            ,action:       ACTION_COLLECTION_ADD
        };

        var crfs_token = window["generated_token"];
        utils.ajax_post("/api/collections", crfs_token, payload).then( res => {
            console.log(" Response = ", res);
        });
    });

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
        let desc  = sender.get_widget("desc").value;

        console.log(" [INFO] Creating collection with title = ", title);

        let res = await utils.ajax_request(  "/api/collections"
                                           , window["generated_token"]
                                           , utils.HTTP_POST
                                           , {
                                               title:       title 
                                             , description: desc 
                                          });

        if(res["result"] == "OK")
        {
            let r = await Dialog_Notify.notify("Information", "Collection created. Ok.", 500);
            utils.dom_page_refresh();
        } else {
            Dialog_Notify.notify("Error", "Failed to create collection.");
        }
    
        dialog.close();
    }


    utils.dom_onClicked("#btn-create-new-collection", () => {         
        collection_create_new();
        console.log(" I was clicked OK. ");

    });


    window["collection_delete"] =  async (collection_id, collection_title) => {

        let answer = await Dialog_YesNo.prompt(
                      "Delete collection."
                    , `Are you sure you want to delete the collection: '${collection_title}' ` );

        if(!answer) { return; }

        let resp = await utils.ajax_request("/api/collections"
                                , window["generated_token"]
                                , utils.HTTP_DELETE
                                , { "collection_id": collection_id });


        if(resp["result"] == "OK")
        { 
            Dialog_Notify.notify("Information", "Collection deleted. Ok.")
            utils.dom_page_refresh();
        } else {
            Dialog_Notify.notify("Error:", "Failed to delete collection.");                  
        }
    };

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

        let res = await utils.ajax_request(  "/api/collections"
                                           , window["generated_token"]
                                           , utils.HTTP_PUT
                                           , {
                                                 id:    collection_id
                                               , title: title 
                                             //, description: desc 
                                          });

        if(res["result"] == "OK")
        {
            dialog_notify.notify("Bookmark added successfuly");
            location.reload();
        } else {
            dialog_notify.notify("Error: bookmark already exists");
        }
    
        dialog.close();        
    }


    window["collection_edit"] = (collection_id, collection_title) => {     
        
        collection_edit(collection_id, collection_title);
    };



}); // ---- End of DOMContentLoaded() envent handler  ------ //


function toggle_sidebar()
{
    var s = DOM_select(".sidebar");
    DOM_toggle(s);
}

// Allows accessing this variable from html templates 
window["toggle_sidebar"] = toggle_sidebar;

function toggle_items_table_info(table_info_id)
{
    // alert("Button toggle clicked ok.");
    let obs = document.querySelector(table_info_id);
    if(obs == null){ alert(`Error: object #${table_info_id} not found. `); }
    console.assert(obs, "Table info supposed not null.");
    DOM_toggle(obs);    
}

window["toggle_items_table_info"] = toggle_items_table_info;

function toggle_action_menu(actionID)
{
    var elem = document.querySelector(actionID);
    DOM_toggle(elem);
}
window["toggle_action_menu"] = toggle_action_menu;

function open_url_newtab(url)
{
    var win = window.open(url, '_blank');
    win.focus();
}
window["open_url_newtab"] = open_url_newtab;

/** @description Add new bookmark to collection  */
async function api_item_add(crfs_token)
{
        let url = await Dialog2_Prompt.prompt("Enter the new URL to be added", "");                            
        console.log("User entered the URL: ", url);

        var query_params = new URLSearchParams(window.location.search);
        if(query_params.get("filter") == "collection")
        {
            console.trace(" [TRACE] Add item to collection")

            var collection_id = query_params.get("A0");
            var payload = { url: url, action: "item_new", collection_id: collection_id };

            var token = window["generated_token"];

            utils.ajax_post("/api/collections/add_item", token, payload).then( async res => {
                if(res["result"] == "OK"){
                    let r = await Dialog_Notify.notify("INFORMATION", "Bookmark added successfuly.", 2000);
                    utils.dom_page_refresh();
                } else {
                    Dialog_Notify.notify("Error", "Error 1: Bookmark already exists.", 2000);
                    //dialog_notify.notify("Error: bookmark already exists", 2000);
                    console.error("Error: bookmark already exists");
                    document.location.href = `/items?filter=search&query=${url}`;
                }
        
            }).catch(err => { 
                console.log("Error: item already exists. [2]");
                Dialog_Notify.notify("Error: " + err);                
            });

            return;
        }

        let starred = query_params.get("filter") == "starred";
        var payload = {url: url, action: "item_new", starred: starred};

        utils.ajax_post("/api/items", crfs_token, payload).then( res => {
            if(res["result"] == "OK")
            {
                Dialog_Notify.notify("INFO", "Bookmark added successfuly", 2000);
                location.reload();
            } else {
                Dialog_Notify.notify("ERROR",  "Error: bookmark already exists", 2000);
                document.location.href = `/items?filter=search&query=${url}`;
            }

        });
}

window["api_item_add"] = api_item_add;

async function item_upload_file2()
{
    // alert("Not implemented Ok.");
    let file_dlg = document.querySelector("#file-choose");
    let file = file_dlg.files[0];
    console.log(" File = ", file);
    let reader = new FileReader();
    reader.readAsDataURL(file);

    /** Possible value for payload:
     * 
     *  {   action: "item_upload"
     *    , name: "embedded-scripting-language.org"
     *    , data: "data:application/octet-stream;base64,KiBFbWJlZGR...."
     *   }
     * 
     */
    reader.onload = async (evt) => {
        let payload = {
             action: "item_upload"
           , name:   file.name
           , data:   evt.target.result
         };
        console.log(" [TRACE] Payload = ", payload);
        var token = window["generated_token"];
        let res = await utils.ajax_post("/api/items", token, payload);
        console.log(" res = ", res);
        utils.dom_page_refresh();
    };
}

async function item_upload_file() 
{
    let file_dlg = document.querySelector("#file-choose");
    let file = file_dlg.files[0];

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
    console.log(res);
    // utils.dom_page_refresh();
}

window["item_upload_file"] = item_upload_file;

async function collection_remove_item(collectionID, itemID)
{

    let res = await utils.ajax_request(  "/api/collections/items"
                                        , window["generated_token"]
                                        , utils.HTTP_DELETE
                                        , {
                                                collection_id: collectionID
                                              , item_id:       itemID 
                                          });

    if(res["result"] == "OK")
    {
        let r = await Dialog_Notify.notify("Information", "Item removed from collection Ok.", 500);
        utils.dom_page_refresh();
    } else {
        Dialg.notify("Error: bookmark already exists", 500);
    }                        
}

window["collection_remove_item"] = collection_remove_item;

async function item_quick_rename(item_id, old_item_title)
{
    let new_item_title = await Dialog2_Prompt.prompt("Change item title:", "", old_item_title);

    console.log(` [TRACE] User provided title := ${new_item_title} ; id = ${item_id} `);

    var payload = { action: "rename", id: item_id, title: new_item_title};    
    var token = window["generated_token"];
    let resp = await utils.ajax_request("/api/items", token, utils.HTTP_PUT, payload)
        
    if(resp["result"] == "OK"){
        let r = await Dialog_Notify.notify("OK", "Item renamed Ok.", 500);
        utils.dom_page_refresh();
    } else {
        Dialog_Notify.notify("ERROR", "Error: failed to rename item.", 500);
    }    

}

window["item_quick_rename"] = item_quick_rename;



async function item_set_starred(checkbox)
{
    let item_id = checkbox.getAttribute("value");
    console.log(" [TRACE] item_set_starred() => Item_ID: ", item_id);

    var payload = { action: "starred", id: item_id, value: checkbox.checked};    
    var token = window["generated_token"];
    let resp = await utils.ajax_request("/api/items", token, utils.HTTP_PUT, payload)
        
    if(resp["result"] == "OK"){
        let r = await Dialog_Notify.notify("OK", "Item set as starred Ok.", 500);
        utils.dom_page_refresh();
    } else {
        Dialog_Notify.notify("ERROR", "Error: failed to set item as starred.");
    }    

}

window["item_set_starred"] = item_set_starred;


async function item_delete(flag, item_id, item_title) 
{
    
    let dialog_title = flag ? "Permanently delete item (Irreversible)." : "Delete item (move to trash)";

    let response = await Dialog_YesNo.prompt( dialog_title
                                      , "Are you sure you want to delete item: " + item_title);

    if(!response) return;
    let mode = flag ? "hard" : "soft";
    let payload = { id: item_id, mode: mode };    
    let token = window["generated_token"];
    let resp = await utils.ajax_request("/api/items", token, utils.HTTP_DELETE, payload);

    if(resp["result"] == "OK"){
        let r = await Dialog_Notify.notify("OK", "Item Deleted Ok.", 500);
        utils.dom_page_refresh();
    } else {
        Dialog_Notify.notify("ERROR", "Error: failed to rename item.");
    }    
}

window["item_delete"] = item_delete;

async function item_snapshot(item_id)
{
    let dlg = new Dialog_Notify();
    dlg.setTitle("Download");
    dlg.setText("Downloading file snapshot. Wait a while ...");
    dlg.show();

    let token = window["generated_token"];
    let payload = { action: "snapshot", id: item_id };
    let resp = await utils.ajax_request("/api/items", token, utils.HTTP_PUT, payload);
    
    if(resp["result"] == "OK")
    {
        await Dialog_Notify.notify_ok(resp["message"]);
        dlg.close();
        utils.dom_page_refresh();
    } else {
        await Dialog_Notify.notify_error(resp["message"]);
        dlg.close();
    }
}

window["item_snapshot"] = item_snapshot;


async function tag_create()
{
    let tag_name = await Dialog2_Prompt.prompt("Enter new tag name:");
    if(tag_name == "") return;
    let token = window["generated_token"];
    
    let payload = { name: tag_name, description: "" };
    let resp = await utils.ajax_request("/api/tags", token, utils.HTTP_POST, payload);
    
    if(resp["result"] == "OK")
    {
        await Dialog_Notify.notify_ok(resp["message"]);
        utils.dom_page_refresh();
    } else {
        await Dialog_Notify.notify_error(resp["message"]);
    }
}

window["tag_create"] = tag_create;

 
async function tag_add(item_id)
{
    let last_input = new LocalStorageString("tag-last-input", "");
        
    let dlg = new Dialog_Datalist_Prompt();
    dlg.setTitle("Select a tag");    
    dlg.setInputText(last_input.get());

    // Returns a list of tags [ { id: "tag id", name: "name", description: "Tag description"} ]
    let token = window["generated_token"];
    let all_tags = await utils.ajax_get("/api/tags", token);
    console.log(all_tags);   
    
    for(let n in all_tags){
        let row = all_tags[n];
        console.log(" row = ", row);
        console.log(` name = ${row[name]} - id = ${row["id"]}`)
        dlg.add_option(row["name"], row["id"]);
    }
    
    // Returns an object like: {  value: "Selected-value-from-list-box", key: 12515 }
    let answer = await dlg.prompt_selected();
    console.log(" ANSWER = ", answer);

    let resp = null;
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
        resp = await utils.ajax_request("/api/tags", token, utils.HTTP_PUT, payload);

    // Add a new item to a given tag 
    } else {
        let payload = {   action: "add_item"
                        , tag_id:  answer["key"]
                        , item_id: item_id 
        };
        console.log(" Payload = ", payload);
        resp = await utils.ajax_request("/api/tags", token, utils.HTTP_PUT, payload);

    }

    console.log(" Resp = ", resp);

    if(resp["result"] == "OK")
    {
        await Dialog_Notify.notify_ok(resp["message"], 500);
        utils.dom_page_refresh();
    } else {
        await Dialog_Notify.notify_error(resp["message"], 500);
    }

}

window["tag_add"] = tag_add;


async function tag_remove(tag_id, bookmark_id)
{    
    let payload = {   action:   "remove_tag_item"
                    , tag_id:    tag_id
                    , item_id:  bookmark_id
                };
    console.log(" Payload = ", payload);
    let token = window["generated_token"];
    let resp = await utils.ajax_request("/api/tags", token, utils.HTTP_PUT, payload);

    if(resp["result"] == "OK")
    {
        await Dialog_Notify.notify_ok(resp["message"], 500);
        utils.dom_page_refresh();
    } else {
        await Dialog_Notify.notify_error(resp["message"], 500);
    }
}
window["tag_remove"] = tag_remove;

async function tag_delete(tag_name, tag_id)
{
    let answer = await Dialog_YesNo.prompt(
                    "Delete tag."
                , `Are you sure you want to delete this tag: '${tag_name}'. 
                   Note: This action is irreversible. ` );

    if(!answer) { return; }

    let resp = await utils.ajax_request("/api/tags"
                            , window["generated_token"]
                            , utils.HTTP_PUT
                            , { 
                                  "tag_name": tag_name 
                                , "tag_id":   tag_id
                                , "action":   "delete_tag"
                                });


    if(resp["result"] == "OK")
    { 
        Dialog_Notify.notify("Information", "Tag deleted. Ok.")
        utils.dom_page_refresh();
    } else {
        Dialog_Notify.notify("Error:", "Failed to delete tag.");                  
    }
}
window["tag_delete"] = tag_delete;

async function tag_update(tag_name, tag_id, tag_desc)
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

    let resp = await utils.ajax_request("/api/tags"
                            , window["generated_token"]
                            , utils.HTTP_PUT
                            , { 
                                  "action":         "update_tag"
                                , "tag_name":        entry_name.value 
                                , "tag_desc":        entry_desc.value 
                                , "tag_id":          tag_id
                                });

    if(resp["result"] == "OK")
    { 
        Dialog_Notify.notify("Information", "Tag deleted. Ok.")
        utils.dom_page_refresh();
    } else {
        Dialog_Notify.notify("Error:", "Failed to delete tag.");                  
    }    

}
window["tag_update"] = tag_update;

function search_bookmarks()
{    
    //console.trace(" [TRACE] I was called. ");
    let search_box    = document.querySelector("#search-entry");
    let query         = encodeURIComponent(search_box.value); 
    let mode_selector = document.querySelector("#search-mode-selector");
    let mode = mode_selector ? mode_selector.value : "AND";
    let url        = `/items?filter=search&query=${query}&mode=${mode}`;    
    //console.log("URL = ", url);
    // Redirect to search route.
    document.location = url;

}
window["search_bookmarks"] = search_bookmarks;

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
window["bookmarks_order_by"] = bookmarks_order_by;


async function tag_filter_window()
{
    let dlg = new Dialog_Datalist_Prompt();
    dlg.setTitle("Select a tag");    
    // dlg.setInputText(last_input.get());

    // Returns a list of tags [ { id: "tag id", name: "name", description: "Tag description"} ]
    let token = window["generated_token"];
    let all_tags = await utils.ajax_get("/api/tags", token);
    console.log(all_tags);   
    
    for(let n in all_tags){
        let row = all_tags[n];
        console.log(" row = ", row);
        console.log(` name = ${row[name]} - id = ${row["id"]}`)
        dlg.add_option(row["name"], row["id"]);
    }    

    // Returns an object like: {  value: "Selected-value-from-list-box", key: 12515 }
    let answer = await dlg.prompt_selected();
    console.log(" ANSWER = ", answer);

    if(answer == null){ return; }

    // Redirect URL 
    document.location = `/items?filter=tag-name&A0=${answer["value"]}`;
}

window["tag_filter_window"] = tag_filter_window;


function keypress_return_adapter(funct)
{
    //console.log(" [TRACE] Install function");
    return (event) => {
        //console.log(" Event = ", event);
        if(event.keyCode != 13) return;
        funct();
    };
};

window["keypress_return_adapter"] = keypress_return_adapter;

function clear_entry_field(dom_element_id)
{
    let field = document.querySelector(dom_element_id);
    console.assert(field != null, `Cannot find entry field to be cleared`);
    field.value = "";
    field.focus();
}

window["clear_entry_field"] = clear_entry_field;


class YoutubeThumb extends HTMLElement {
    constructor() {
        super()
        this.attachShadow( { mode: 'open' } )            
    }

    connectedCallback() {
        var video = this.getAttribute("video");
        console.log("VIDEO = ", video);
        this.shadowRoot.innerHTML = `
            <style>
                .youtube-embed {
                    visibiity: visible;
                    /* background-color: gray; */
                    width:  500px;
                    height: auto;
                    display: block;
                }

                span {
                    color: black;
                    font-size: 14pt;
                    font-weight: 500%;
                }

                img {
                    width:  60%;
                    height: auto;
                }

            </style>

            <div class="youtube-embed">                 
                 <a href="https://www.youtube.com/watch?v=${video}" target="_blank"> 
                   <img src="https://img.youtube.com/vi/${video}/sddefault.jpg" />                             
                 </a>
            </div>
            `;                                               
    }
}
customElements.define('youtube-thumb', YoutubeThumb);