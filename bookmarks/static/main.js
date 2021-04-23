import { Dialog_Basic, Dialog2_Prompt, Dialog_YesNo
      , DialogForm, Dialog_Notify, Dialog_Datalist_Prompt
        } from "/static/dialogs.js";

import * as utils from "/static/utils.js";



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
        
        // console.log(" [TRACE] collections = ", colls);
    });

    const ACTION_COLLECTION_ADD = "ADD";
    const ACTION_COLLECTION_NEW = "NEW";
    
    utils.dom_onClicked("#btn-bulk-add-to-collection", () => {
        var items = get_selected_items_for_bulk_operation();
        var selectionbox = document.querySelector("#selector-collection-add");
        var collectionID = selectionbox[selectionbox.selectedIndex]["value"];

        // console.log(" items = ", items);
        // console.log(" collection = ", collectionID);

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






}); // ---- End of DOMContentLoaded() envent handler  ------ //

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