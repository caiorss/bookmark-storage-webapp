
/** @brief Performs Http POST request to some endpoint. 
 *  @param {string} url         - Http request (REST API) endpoint 
 *  @param {string} crfs_token  - Django CRFSS token from global variable (generated_token)
 *  @param {object} data        - HTTP request body, aka payload  
 */
async function ajax_post(url, crfs_token, data)
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

async function ajax_get(url, crfs_token, data)
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
function dom_page_refresh()
{
    location.reload();
}


/** Wrapper function to document.querySelectorAll, but returns array instead of NodeList. 
 * 
 */
function dom_querySelectorAll(css_selector)
{
    return Array.prototype.slice.call(document.querySelectorAll(css_selector));
}

function dom_onClicked(css_selector, callback)
{
    var elem = document.querySelector(css_selector);
    console.assert(elem, "dom_onClicked() => Element with css_selector not found in DOM");
    elem.addEventListener("click", callback);
}

/* Insert HTML code fragment to some DOM element. 
 *  
 *  Usage example: 
 * 
 *     var anchor = document.querySelector("#element-dom-id");
 *     var div = dom_insert_html(anchor, `<div> <h1>Title</h1> <button>My button</button></div>`);   
 ******************************************************************/
function dom_insert_html(anchor_element, html)
{
    var el = document.createElement("template");
    el.innerHTML = html;
    var elem = el.content.firstChild;
    anchor_element.appendChild(elem);
    return elem;
}


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




// ----------- Keyboard Navigation ------------------ //

navigation_enabled_flag = "navigation_enabled";

flagKeyboardShortcut = new LocalStorageFlag("navigation_enabled", false);


function KeyDispatcher() {
    this._disp = {};
    this._toggle_key_code = 27; /* ESC */

    this.add_key = (keycode, callback) => {  this._disp[keycode] = callback; };

    this.process_key = (e) => {
	if(e.which == this._toggle_key_code)
	    enable_keyboard_shortcut(flagKeyboardShortcut.toggle());
	    
	console.log(" [TRACE] User typed key = " + e.which);
	var callback = this._disp[e.which];
	if(flagKeyboardShortcut.get() && callback != null){ callback(); }
    };
    
    this._ctor = (() => {
	                  document.onkeyup = this.process_key;
	                  console.log(" [TRACE] Constructed OK.");
			})();
}


function show_keybind_help()
{
    alert([  " Keyboard Navigation Enabled. Ok "
            ,"\n Keybindings: "
            ," === General ==========================="
            ,"  => (?) - Show this messagebox"
            ,"  => (t) - Toggle sidebar"
            ,"  => (y) - Toggle items information table."
            ," === Items ============================="
            ," => (j) - Focus on previous bookmark"
            ," => (k) - Focus on next bookmark"            
            ," => (o) - Open Selected bookmark in a new tab and switch to it."
            ," => (i) - Open Selected bookmark in a new tab. (DON'T switch to it)"
            ," === Results Paging ====================="
            ,"  => (b) - Show previous 15 results (paging)."
            ,"  => (n) - Show next 15 results (paging)."            
            ," === Pages =============================="
            ,"  => (1) - Show all items ordered by newest."
            ,"  => (2) - Show all items ordered by oldest."
            ,"  => (3) - List only starred items."
            ,"  => (4) - List saved searches"
            ,"  => (5) - List music bookmarks."
          ].join("\n"));
}

function Counter(value, max){
    this.value = value;
    this.max   = max;
    this.get = () => this.value;
    this.increment = () => { if(this.value < max) this.value++; return this.value; }
    this.decrement = () => { if(this.value > 0  ) this.value--; return this.value; }
}

counter = new Counter(-1, 14);

// Shows whether keyboard shortcuts are enabled or disabled.
function set_keyboard_indicator(flag)
{
    var q = document.querySelector("#keyboard-status");
    q.textContent = flag ? "Keyboard shortcuts enabled" : "Keyboard shortcuts disabled ";
    q.style.background = flag ? "green" : "blue";
};

function enable_keyboard_shortcut(navigation_enabled)
{
    // navigation_enabled = !navigation_enabled;      
    flagKeyboardShortcut.set(navigation_enabled);
    set_keyboard_indicator(navigation_enabled);
};


function isMobileDevice() {
    try{ 
         document.createEvent("TouchEvent");
         //alert('Is mobile device OK');
         return true; 
        }
    catch(e){ 
        //alert('NOT MOBILE Device');
        return false;        
    }
};

kdb = new KeyDispatcher();
kdb.add_key(84 /* t */,() => {
    // console.log(" [TRACE] Toggle menu bar.");
     toggle_sidebar();
     var q = document.querySelector(".sidebar-nav a")
     q.focus();    
});

kdb.add_key(89 /* y */, toggle_items_table_info);
kdb.add_key(191 /* '/' forward slash */, show_keybind_help);

kdb.add_key(78 /* n */, () => {
    var q = document.querySelector("#page-next-button");
    if(q != null) window.location.href = q.href;
});

kdb.add_key(66 /* b */, () => {
    var q = document.querySelector("#page-prev-button");
    if(q != null) window.location.href = q.href;

});

// Show latest or newest added bookmarks
kdb.add_key(49 /* 1 */, () => {
    window.location.href = "/items?filter=latest";
});

kdb.add_key(50 /* 2 */, () => {
    window.location.href = "/items?filter=oldest";
});

kdb.add_key(50 /* 3 */, () => {
    window.location.href = "/items?filter=starred";;
});

kdb.add_key(51 /* 4 */, () => {
    window.location.href = "/search/list";
});

// Select previous link 
kdb.add_key(74 /* j */, () => {
    var links = document.querySelectorAll(".item-bookmark-link");
    var e = links[counter.decrement()];
    e.focus();
    //counter.decrement();        
    //console.log(" [TRACE] current item = " + counter.get());
    //if(current_item < links.length){ current_item = current_item + 1; }   
});

kdb.add_key(75 /* k */, () => {
    var links = document.querySelectorAll(".item-bookmark-link");      
    var e = links[counter.increment()];
    e.focus();
    //counter.increment();
    //console.log(" [TRACE] current item = " + counter.get());
});

// Open current bookmark when user types 'O'
kdb.add_key(79 /* o */, () => {
    var elem = document.activeElement;
    if(elem.className == "item-bookmark-link")
    {
        var win = window.open(elem.href, '_blank');
        win.focus();
    }        
});

// Open current bookmark when user types 'O'
kdb.add_key(83 /* s */, () => {
    var elem = document.querySelector("#search-entry-box");
    elem.focus();
    enable_keyboard_shortcut(false);    
});

// Shortcut for adding new item.
kdb.add_key(187 /* + */, () => {
    enable_keyboard_shortcut(false);
    window.location.href = "/items/new";
    
});



// ---- Executed after document (DOM objects) is loaded ---------- //

flagItemDetailsVisible = new LocalStorageFlag("itemsTableVisible", true);


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


site_theme = new LocalStorageString("site_theme");

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
    return dom_querySelectorAll(".bulk-checkbox")
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

    var resp = await ajax_post("/api/bulk", crfs_token, payload);
    console.log("Response = ",  resp);

    //return resp;
    // Reload current page 
    location.reload();
}

class DialogFormBuilder extends HTMLElement 
{
   
    constructor()
    {
        super()
        this.attachShadow( { mode: 'open' } )

        this.node = document.createElement("dialog");

        this.submit_callback = () => { alert("Submit Clicked"); }

        console.log(" Node = ", this.node);

        var html = `
            <div>                
                <h4 id="dialog-title">Dialog Title</h4>

                <span id="dialog-description">Dialog description</span>
                <table> 
                    <tbody>

                    </tbody>
                </table>
                <button id="btn-cancel">Close</button>
                <button id="btn-submit">Submit</button>
             </div>
        `.trim();

        var el       = document.createElement("template");
        el.innerHTML = html;
        var elem     = el.content.firstChild;
        this.node.appendChild(elem);

        var self = this;

        var btn_cancel = this.node.querySelector("#btn-cancel");
        btn_cancel.addEventListener("click", () =>  self.node.close() );

        var btn_submit = this.node.querySelector("#btn-submit");
        btn_submit.addEventListener("click", () =>  self.submit_callback() );

        console.log(" Node = ", this.node);
    }

    connectedCallback(){
        this.shadowRoot.innerHTML = `
            <style>
                dialog {
                    position: fixed; 
                    top:      20px;
                    
                    background-color: darkgray                    
                    color: black;

                    border-radius: 20px;
                    z-index: 2;
                }
            </style>            
        `;

        this.shadowRoot.appendChild(this.node);
    }

    attach(dom_node)
    {
        dom_node.appendChild(this);
    }

    attach_body()
    {
        document.body.appendChild(this)
    }

    setTitle(title)
    {
        var label = this.shadowRoot.querySelector("#dialog-title");
        label.textContent = title;
        return this;
    }

    setText(text)
    {
        var desc = this.shadowRoot.querySelector("#dialog-description");
        desc.textContent = text;
        return this;
    }

    get_root() {
        return this.node;
    }

    add_row_widget(label, widget)
    {
        var anchor = this.node.querySelector("tbody");
        
        var th_label = document.createElement("th");
        th_label.textContent = label;
        
        var th_widget = document.createElement("th");
        th_widget.appendChild(widget);

        var tr = document.createElement("tr");
        tr.appendChild(th_label);
        tr.appendChild(th_widget);

        // Add row to table.
        anchor.appendChild(tr);

        return widget;
    }

    add_row_input(label)
    {
        var widget = document.createElement("input");
        return this.add_row_widget(label, widget);
    }

    show(){ this.node.showModal(true); }
    hide(){ this.node.close();         }

    setVisible(flag){
        if(flag) 
            this.node.showModal(true);
        else 
            this.node.close();
    }

    onSubmit(callback){
        this.submit_callback = callback;
    }

}

customElements.define('dialog-formbuilder', DialogFormBuilder);


class Dialog_GenericNotification extends HTMLElement
{
    
    constructor()
    {
        super()

        this.node = document.createElement("dialog");

        this.submit_callback = (flag) => { alert("Submit Clicked"); }

        var html = `
            <div>    
                <div>            
                    <h4 id="dialog-title">Dialog Title</h4>
                    <span id="dialog-text">Dialog Text</span>
                
                </div id="dialog-body"> 
                <div>
                
                </div>
                <div>
                    <button id="btn-close">Close</button>
                    <button id="btn-submit">Submit</button>
                </div>
             </div>
        `.trim();

        var el       = document.createElement("template");
        el.innerHTML = html;
        var elem     = el.content.firstChild;
        this.node.appendChild(elem);

        var self = this;
        this.node.querySelector("#btn-close").addEventListener("click", () => { 
            self.node.close();
            this.submit_callback(false);
        });
        this.node.querySelector("#btn-submit").addEventListener("click", () => { 
            self.submit_callback() 
            this.submit_callback(true);
        });
    }

    connectedCallback()
    {
        this.shadowRoot.innerHTML = `
            <style>
                dialog {
                    position: fixed; 
                    top:      20px;
                    
                    background-color: darkgray                    
                    color: black;

                    border-radius: 20px;
                    z-index: 2;
                }
            </style>            
        `;

        this.shadowRoot.appendChild(this.node);
    }

    attach_body()
    {
        document.body.appendChild(this)
    }

    setTitle(title)
    {
        var label = this.node.querySelector("#dialog-title");
        label.textContent = title;
        return this;
    }

    setText(text)
    {
        var desc = this.node.querySelector("#dialog-text");
        desc.textContent = text;
        return this;
    }

    setButtonCloseLabel(text)
    {
        var desc = this.node.querySelector("#btn-close");
        desc.textContent = text;
    }

    setButtonSubmitLabel(text)
    {
        var desc = this.node.querySelector("#btn-submit");
        desc.textContent = text;
    }

    onSubmit(callback) {
        this.submit_callback = callback;
    }

    /** Hides/show submit submit button. */
    setSubmitVisible(flag) {
        var btn = this.node.querySelector("#btn-submit");

        if(!flag){            
            btn.style.visibility = "hidden";
            btn.style.display    = "none";
            return;
        }
        btn.style.visibility = "visible";
        btn.style.display    = "block";
    }

    show() { this.node.showModal(true); }
    hide() { this.node.close();         }
    close(){ this.node.close();         }

    setVisible(flag) 
    {
        if(flag) 
            this.node.showModal(true);
        else
            this.node.close(); 
    }


} // --- End of class Dialog_GenericNotification -------------//

customElements.define('dialog-generic', Dialog_GenericNotification);


class Dialog_OkCancel extends Dialog_GenericNotification
{
    constructor(){
        super()
        this.attachShadow( { mode: 'open' } )

        this.setTitle("Are you sure?")
        this.setText("Are you sure you want to delete this item?");
        this.setButtonSubmitLabel("OK");
        this.setButtonCloseLabel("Cancel");

        this.onSubmit( (flag) => {
            console.log(" [INFO] User clicked submit ? = ", flag);
            this.close();
        });
    }
}

customElements.define('dialog-okcancel', Dialog_OkCancel);


/**
 * Usage: 
 * ```
 *   var c = new NotificationDialog();
 *   c.attach(document.body);
 *   // Timeout 1 second (= 1000 milliseconds)
 *   c.notify("My notifcation", 1000);
 * ```
 */
class NotificationDialog extends Dialog_GenericNotification 
{
    constructor() {
        super()
        this.attachShadow( { mode: 'open' } )

        this.onSubmit((flag) => {});
        this.setSubmitVisible(false);
    }

    notify(text, timeout = 1500)
    {
        this.setText(text);
        this.setVisible(true);
        var self = this;
        setTimeout(() => self.setVisible(false) , timeout);
    }

}

customElements.define('dialog-notification', NotificationDialog);


//----------------------------------------------//
//    D I A L O G S                             // 
//----------------------------------------------//

dialog_notify = new NotificationDialog();

// Callback executed after DOM is fully loaded
document.addEventListener("DOMContentLoaded", () => {

    dialog_notify.attach_body();
    dialog_notify.id = "dialog-notify";
    // dialog_notify.notify("Page created Ok", 900);

    var flag = flagItemDetailsVisible.get();
    var obs = document.querySelectorAll(".item-details");
    obs.forEach(x => DOM_set_visibility(x, flag));    
    set_keyboard_indicator(flagKeyboardShortcut.get());

    var q = document.querySelector("#div-keyboard-status");
    if(isMobileDevice()){ DOM_toggle(q); }

    var elem_item_detail = document.querySelector("#item-details");
     

    var theme_selection_box = document.querySelector("#theme-selector-box");
    theme_selection_box.onchange = selection_changed;

    var theme = site_theme.get("dark_mode");
    set_theme(theme);

    if(theme == "dark_mode") theme_selection_box.selectedIndex = 0;
    if(theme == "light_mode") theme_selection_box.selectedIndex = 1;

    var body = document.body;

    var dialog = dom_insert_html(body, `
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

    dom_onClicked("#btn-bulk-actions",     () => dialog.showModal() );
    dom_onClicked("#btn-bulk-add-starred", () => ajax_perform_bulk_operation(ACTION_ADD_STARRED) );
    dom_onClicked("#btn-bulk-rem-starred", () => ajax_perform_bulk_operation(ACTION_REM_STARRED) );
    dom_onClicked("#btn-bulk-delete",      () => ajax_perform_bulk_operation(ACTION_DELETE) );
    dom_onClicked("#btn-bulk-restore",     () => ajax_perform_bulk_operation(ACTION_RESTORE) );

    var selectbox  = dialog.querySelector("#selector-collection-add");
    var crfs_token = window["generated_token"];
    
    // Fill selection box with all user collections 
    ajax_get("/api/collections", crfs_token).then( colls => {
        for(let n  in colls){
            var opt   = document.createElement("option");
            console.log(" row = ", colls[n]);
            opt.text  = colls[n]["title"];
            opt.value = colls[n]["id"];
            selectbox.add(opt, -1);    
        }
        
        console.log(" [TRACE] collections = ", colls);
    });

    const ACTION_COLLECTION_ADD = "ADD";
    const ACTION_COLLECTION_NEW = "NEW";
    
    dom_onClicked("#btn-bulk-add-to-collection", () => {
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
        ajax_post("/api/collections", crfs_token, payload).then( res => {
            console.log(" Response = ", res);
        });
    });

    dialog_CreateCollection = new DialogFormBuilder();
    dialog_CreateCollection.attach_body();
    dialog_CreateCollection.setTitle("Create new collection");
    dialog_CreateCollection.setText("Enter the following informations:");

    var input_title       = dialog_CreateCollection.add_row_input("Title:");
    var input_description = dialog_CreateCollection.add_row_input("Description:");

    dialog_CreateCollection.onSubmit( () => {

        var p = ajax_post("/api/collections/new", window["generated_token"], {
              title: input_title.value 
            , description: input_description.value
        });

        p.then( res => {
            if(res["result"] == "OK"){
                dialog_notify.notify("Bookmark added successfuly");
                location.reload();
            } else {
                dialog_notify.notify("Error: bookmark already exists");
            }
    
        })
    });

    dom_onClicked("#btn-create-new-collection", () => { 
        // alert(" Clicked at create new collection Ok. ");
        dialog_CreateCollection.show();
    });

    dialog_collection_delete = new Dialog_OkCancel();
    dialog_collection_delete.setTitle("Delete collection");
    dialog_collection_delete.attach_body();
    
    window["collection_delete"] = (collection_id, collection_title) => {
        dialog_collection_delete.setText(`Are you sure you want to delete the collection: '${collection_title}' `)
        dialog_collection_delete.show();
        dialog_collection_delete.onSubmit( flag => {
            if(!flag) return;

            var p = ajax_post("/api/collections/del", window["generated_token"], { "collection_id": collection_id });

            p.then( res => {
                if(res["result"] == "OK"){
                    dialog_notify.notify("Bookmark added successfuly");
                    location.reload();
                } else {
                    dialog_notify.notify("Error: bookmark already exists");
                }
            });

        });
    };

});


function toggle_sidebar()
{
    var s = DOM_select(".sidebar");
    DOM_toggle(s);
}

function toggle_items_table_info()
{
    flagItemDetailsVisible.toggle();
    var flag = flagItemDetailsVisible.get();
    var obs = document.querySelectorAll(".item-details");
    obs.forEach(x => DOM_set_visibility(x, flag));    
}

function toggle_action_menu(actionID)
{
    var elem = document.querySelector(actionID);
    DOM_toggle(elem);
}

function open_url_newtab(url)
{
    var win = window.open(url, '_blank');
    win.focus();
}

function api_item_add(crfs_token)
{
    var url = prompt("Enter the URL to add:", "");
    if(url == null) return;

    var query_params = new URLSearchParams(window.location.search);
    if(query_params.get("filter") == "collection")
    {
        console.trace(" [TRACE] Add item to collection")

        var collection_id = query_params.get("A0");
        var data = { url: url, collection_id: collection_id };

        var token = window["generated_token"];
        ajax_post("/api/collections/add_item", token, data).then( res => {
            if(res["result"] == "OK"){
                dialog_notify.notify("Bookmark added successfuly", 2000);
                location.reload();
            } else {
                dialog_notify.notify("Error: bookmark already exists", 2000);
            }
    
        }).catch(err => { 
            dialog_notify.notify(" Error: " + err)
        });

        return;
    }


    var payload = {url: url};
    ajax_post("/api/item", crfs_token, payload).then( res => {
        if(res["result"] == "OK"){
            dialog_notify.notify("Bookmark added successfuly", 2000);
            location.reload();
        } else {
            dialog_notify.notify("Error: bookmark already exists", 2000);
        }

    });
}


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