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
        if(q == null){
            localStorage.setItem(name, value);
        }
    }());

    this.get     = ()      => JSON.parse(localStorage.getItem(this.name)) || false;
    this.set     = (value) => localStorage.setItem(this.name, value);
    this.toggle  = ()      => this.set(!this.get());  
}

// ----------- Keyboard Navigation ------------------ //

navigation_enabled_flag = "navigation_enabled";

flagKeyboardShortcut = new LocalStorageFlag("navigation_enabled", false);

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
    q.style.background = flag ? "green" : "black";
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

document.onkeyup = (e) => {
    // for IE to cover IEs window event-object
    var e = e || window.event; 
    var key = String.fromCharCode(e.which);
    console.log(" Pressed keybindind => key = " + key + " ; code = " + e.which);

    var navigation_enabled = flagKeyboardShortcut.get();

    // Alt + P for enabling shortcut navigation 
    if(e.which == 27) 
    {
        enable_keyboard_shortcut(!navigation_enabled);
    }    
    if(navigation_enabled && key == "T") 
    {
        toggle_sidebar();
        var q = document.querySelector(".sidebar-nav a")
        q.focus();
    }
    if(navigation_enabled && key == "Y") 
    {
        toggle_items_table_info();
    }

    // User types: (?) question mark key.
    if(navigation_enabled && e.which == 191) 
    {
        show_keybind_help();
    }

    // Show next page 
    if(navigation_enabled && key == "N") 
    {
        var q = document.querySelector("#page-next-button");
        if(q != null) window.location.href = q.href;
    }

    // Show previous page 
    if(navigation_enabled && key == "B") 
    {
        var q = document.querySelector("#page-prev-button");
        if(q != null) window.location.href = q.href;
    }
    
    if(navigation_enabled && key == "1") 
    {
        window.location.href = "/items?filter=latest";
    }
    if(navigation_enabled && key == "2") 
    {
        window.location.href = "/items?filter=oldest";
    }
    if(navigation_enabled && key == "3") 
    {
        window.location.href = "/items?filter=starred";
    }
    if(navigation_enabled && key == "4") 
    {
        window.location.href = "/search/list";
    }
    
    // Select previous link 
    if(navigation_enabled && key == "J") 
    {
        var links = document.querySelectorAll(".item-bookmark-link");
        var e = links[counter.decrement()];
        e.focus();
        //counter.decrement();        
        //console.log(" [TRACE] current item = " + counter.get());
        //if(current_item < links.length){ current_item = current_item + 1; }
    }
    
    // Select next link 
    if(navigation_enabled && key == "K") 
    {
        var links = document.querySelectorAll(".item-bookmark-link");      
        var e = links[counter.increment()];
        e.focus();
        //counter.increment();
        //console.log(" [TRACE] current item = " + counter.get());
    }

    // Open current bookmark when user types 'O'
    if(navigation_enabled && key == "O") 
    {
        var elem = document.activeElement;
        if(elem.className == "item-bookmark-link")
        {
            var win = window.open(elem.href, '_blank');
            win.focus();
        }        
    }    
    // Open current bookmark when user types 'O'
    if(navigation_enabled && key == "I") 
    {
        var elem = document.activeElement;
        if(elem.className == "item-bookmark-link")
        {
            var win = window.open(elem.href, '_blank');
        }        
    }    

    if(navigation_enabled && key == "S")
    {
        var elem = document.querySelector("#search-entry-box");
        elem.focus();
        enable_keyboard_shortcut(false);
    }

    // Shortcut for adding new item.
    // 187 is the code of character '='
    if(navigation_enabled && e.which ==  187)
    {
        enable_keyboard_shortcut(false);
        window.location.href = "/items/new";
        
    }
};

// ---- Executed after document (DOM objects) is loaded ---------- //

flagItemDetailsVisible = new LocalStorageFlag("itemsTableVisible", true);

document.addEventListener("DOMContentLoaded", () => {
    var flag = flagItemDetailsVisible.get();
    var obs = document.querySelectorAll(".item-details");
    obs.forEach(x => DOM_set_visibility(x, flag));    
    set_keyboard_indicator(flagKeyboardShortcut.get());

    var q = document.querySelector("#div-keyboard-status");
    if(isMobileDevice())
    {
        DOM_toggle(q);
    }
 
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


