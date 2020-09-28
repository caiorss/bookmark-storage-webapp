import {Dialog2_Prompt, Dialog_GenericNotification, Dialog_YesNo
      , DialogForm, Dialog_Notify, DialogFormBuilder} from "/static/dialogs.js";

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
function LocalStorageFlag(name, value)
{
    this.name = name;
    this._dummy = (function() {
        var q = localStorage.getItem(name);
        if(q == null || q == "undefined" ){
            localStorage.setItem(name, value);
        }
    }());

    this.get     = () => {
        var result = localStorage.getItem(this.name);
        if(result == "undefined") { 
            this.set(false);
            return false;            
        }
        return JSON.parse(result) || false;
    };
    this.set     = (value) => localStorage.setItem(this.name, value);
    this.toggle  = ()      => { this.set(!this.get()); return this.get(); }
};



function LocalStorageString(name, value)
{
    this.name = name;
    this._dummy = (function() {
        var q = localStorage.getItem(name);
        if(q == null || q == "undefined" ){
            localStorage.setItem(name, value);
        }
    }());

    this.get = ( default_value ) => {
        var result = localStorage.getItem(this.name);
        if(result == "undefined") { 
            this.set(default_value);
            return default_value;            
        }
        return result;
    };
    this.set = (value) => localStorage.setItem(this.name, value);    
};



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


class Dialog_Search_Item extends Dialog_GenericNotification
{
    constructor()
    {
        super()
        this.attachShadow( { mode: 'open' } )

        this.setTitle("Search bookmarks");
        this.setText("");

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

        this.onClose(() => {
            this.reset()
            console.log(" [INFO] Window closed ok. ");
        });

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

        this.onSubmit((flag) => {
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
                    <input type="checkbox" class="bookmark-checkbox" value="${id}"></input>
                    <a target="_blank" href="${url}">[${id}] ${title}</a>
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
    
    // set_keyboard_indicator(flagKeyboardShortcut.get());

/*     var q = document.querySelector("#div-keyboard-status");
    if(isMobileDevice()){ DOM_toggle(q); }
 */
    var elem_item_detail = document.querySelector("#item-details");
     

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
    dialog_collection_edit.attach_body();
    dialog_collection_edit.setTitle("Create new collection");
    dialog_collection_edit.setText("Enter the following informations:");
    dialog_collection_edit.add_row_input("title", "Title:");
    dialog_collection_edit.add_row_input("desc", "Description:");


    async function collection_create_new()
    {
        // alert(" Clicked at create new collection Ok. ");
        dialog_collection_edit.show();

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

function toggle_items_table_info()
{
    flagItemDetailsVisible.toggle();
    var flag = flagItemDetailsVisible.get();
    var obs = document.querySelectorAll(".item-details");
    obs.forEach(x => DOM_set_visibility(x, flag));    
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
            var data = { url: url, collection_id: collection_id };

            var token = window["generated_token"];

            utils.ajax_post("/api/collections/add_item", token, data).then( async res => {
                if(res["result"] == "OK"){
                    let r = await Dialog_Notify.notify("INFORMATION", "Bookmark added successfuly.", 2000);
                    location.reload();
                } else {
                    Dialog_Notify.notify("Error", "Error: Bookmark already exists.", 2000);
                    //dialog_notify.notify("Error: bookmark already exists", 2000);
                }
        
            }).catch(err => { 
                Dialog_Notify.notify("Error: " + err);
            });

            return;
        }


        var payload = {url: url};
        utils.ajax_post("/api/items", crfs_token, payload).then( res => {
            if(res["result"] == "OK"){
                Dialog_Notify.notify("INFO", "Bookmark added successfuly", 2000);
                location.reload();
            } else {
                Dialog_Notify.notify("ERROR",  "Error: bookmark already exists", 2000);
            }

        });
}

window["api_item_add"] = api_item_add;

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
        let r = await Dialog_Notify.notify("OK", "Item set as starred Ok.", 1000);
        // location.reload();
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