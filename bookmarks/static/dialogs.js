import dialogPolyfill from "/static/dialog-polyfill.esm.js";
// window["dialogPolyfill"] = dialogPolyfill;

export class Dialog_Basic extends HTMLElement
{
    constructor()
    {
        super()
        this.attachShadow( { mode: 'open' } )

        this.node = document.createElement("dialog");
        dialogPolyfill.registerDialog(this.node);
        this._promise_callback = (flag) => {  };
        this._submit_callback = (falg) => {  };
        this._custom_style = "";

        /** Detach current dialog from document body when the window is closed. */
        this._detach_on_close = true;

        var html = `
            <div>    
                <div>            
                    <h4 id="dialog-title"></h4>
                    <span id="dialog-text"></span>
                </div>

                <div id="dialog-body"> 
                </div>
                <div>
                    <button id="btn-close">Close</button>
                    <button id="btn-submit">Submit</button>
                </div>
             </div>
        `.trim();

        var el = document.createElement("template");
        el.innerHTML = html;
        var elem = el.content.firstChild;
        this.node.appendChild(elem);

        this.node.querySelector("#btn-close").addEventListener("click", () => { 
            this._promise_callback(false);
            this._submit_callback(false);
            this.node.close();
            if(this._detach_on_close) this.detach_body();
        });

        this.node.querySelector("#btn-submit").addEventListener("click", () => {             
            this._promise_callback(true);
            this._submit_callback(true);
            this.node.close();
            if(this._detach_on_close) this.detach_body();
        });

       this.attach_body();
       //dialog.attach_body();
    }


    connectedCallback()
    {
        var window_width = window.innerWidth > 600 ? "500px" : "90%";
        var window_height = window.innerHeight > 1000 ? "600px" : "95%";
        //alert(" Window width = ", window_width);

        console.assert(this.shadowRoot, "Component supposed to be attached to DOM body");

        this.shadowRoot.innerHTML = `
            <style>
                body {
                    overscroll-behavior-y: contain;
                }

                dialog {
                    position: fixed; 
                    top:      20px;
                    
                    background-color: darkgray                    
                    color: black;

                    width:  ${window_width};
                    max-width:  ${window_width};
                    max-height: ${window_height};

                    border-radius: 20px;
                    z-index: 2;
                }

                ${this._custom_style}

                #dialog-input { width: 100%; }
            </style>            
        `.trim();

        this.shadowRoot.appendChild(this.node);
    }

    /** Set this flag to true in order to create a stateful dialog
     * , which is removed when it is closed.
     */
    detach_on_close(flag){ this._detach_on_close = flag; }

    detach_body() 
    {
        this.parentNode.removeChild(this);
    }

    attach_body()
    {
        document.body.appendChild(this)
    }

    show() { this.node.showModal(); }
    hide() { this.node.close();         }
    close(){ this.node.close();         }

    run() 
    {
        this.show();
        let p = new Promise( (resolve, reject) => {
            this._promise_callback = (flag) => {
                resolve(flag);
            };
        });
        return p;
    }

    insertBodyHtml(html)
    {

        var el = document.createElement("template");
        el.innerHTML = html.trim();
        var elem = el.content.firstChild;
        this.node.querySelector("#dialog-body")
                 .appendChild(elem);
        // console.log(" [INFO] insertBodyHtml() = ", elem);
        return elem;
    }

    setCustomStyle(style)
    {
        this._custom_style = style;
    }

    setSubmitCallback(callback)
    {
        this._submit_callback = callback;
    }

    setTitle(title)
    {
        this.node.querySelector("#dialog-title").textContent = title;
        return this;
    }

    setText(text)
    {
        this.node.querySelector("#dialog-text").textContent = text;
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

    /** Hides/show submit submit button. */
    setSubmitVisible(flag) 
    {
        var btn = this.node.querySelector("#btn-submit");

        if(!flag){            
            btn.style.visibility = "hidden";
            btn.style.display    = "none";
            return;
        }
        btn.style.visibility = "visible";
        btn.style.display    = "block";
    }

    addChild(dom_element)
    {
        let anchor = this.node.querySelector("#dialog-body");
        anchor.appendChild(dom_element);
    }


} // ---- Dialog_Basic class ---------------// 

customElements.define('dialog-basic', Dialog_Basic);
window["dialog-basic"] = Dialog_Basic;

/* ========== Dialog Form ===================== */


export class DialogForm extends Dialog_Basic 
{   
    constructor()
    {
        super()
       /*  this.attachShadow( { mode: 'open' } ) */
        this.created_widgets = {}

        var html = `
                <table> 
                    <tbody>

                    </tbody>
                </table>
        `;
        this.insertBodyHtml(html);

    }

    get_widget(key){
        return this.created_widgets[key];
    }

    async onConfirm()
    {
        let answer = await this.run();
        if(!answer) 
            throw new Error("User cancelled promise");
        else 
            return this;
    }

    add_row_widget(key, label, widget)
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

        this.created_widgets[key] = widget;
        return widget;
    }

    add_row_input(key, label)
    {
        var widget = document.createElement("input");
        return this.add_row_widget(key, label, widget);        
    }

}

customElements.define('dialog-form', DialogForm);
window["DialogForm"] = DialogForm;


/** ============ Notification Dialog ============= */


export class Dialog_Notify extends Dialog_Basic
{
    constructor() 
    {
        super()
        this.setSubmitVisible(false);
    }

    static notify(title, message, timeout = 2000)
    {
        let dialog = new Dialog_Notify();
        dialog.setTitle(title);
        dialog.setText(message);
        dialog.show();

        let p = new Promise( (resolve, reject) => {
            setTimeout(() => {
                dialog.hide();
                dialog.detach_body();
                resolve(true);
            } , timeout);        
    
        });
        return p;
    }

    static notify_error(text) 
    {
        return Dialog_Notify.notify("ERROR Notification", text);
    }

    static notify_ok(text) 
    {
        return Dialog_Notify.notify("OK", text);
    }
}

customElements.define('dialog-notify', Dialog_Notify);
window["dialog-notify"] = Dialog_Notify;

// ========== D I A L O G -  Y E S - N O ==========// 


export class Dialog_YesNo extends Dialog_Basic
{
    constructor(){
        super()
        this.setButtonSubmitLabel("OK");
        this.setButtonCloseLabel("Cancel");
    }

    static async prompt(title, message){
        let dialog = new Dialog_YesNo();
        dialog.setTitle(title);
        dialog.setText(message);
        let resp = await dialog.run();
        return resp;
    }
}

customElements.define('dialog-yesno', Dialog_YesNo);



// =========== D I A L O G - P R O M P T ===============//


/** Non-Stateful prompt dialog, similar to function prompt();
 */
export class Dialog2_Prompt extends Dialog_Basic
{
    constructor(title, text, input = "")
    {
        super()
        this.input = this.insertBodyHtml("<input id='dialog-input'></input>");
        this.input.value = input;
        this.setTitle(title);
        this.setText(text);
        this.setCustomStyle(`input { width: 100%; }`);
    }
    
    static async prompt(title, text, input = "")
    {
        let dialog = new Dialog2_Prompt(title, text, input);
        let is_submit = await dialog.run();
        if(is_submit && dialog.input.value != "") { 
            return dialog.input.value; 
        }
        throw new Error("User clicked cancel");
    }


}

customElements.define('dialog2-prompt', Dialog2_Prompt);
window["dialog2-prompt"] = Dialog2_Prompt;


// ======= D I A L O  - D A T A L I S T - P R O M P T ===================// 
// 
export class Dialog_Datalist_Prompt extends Dialog_Basic
{
    constructor(title , text, input = "")
    {
        super()
        this.insertBodyHtml(`
            <div>
                <input id='dialog-input' list='dataset'></input>
                <datalist id="dataset"></datalist>
            </div>
        `);
        this._input = this.node.querySelector("#dialog-input");
        this._dataset = this.node.querySelector("#dataset");

        this.setTitle("Select an option");
        this.setCustomStyle(`input { width: 100%; }`);
    }

    add_option(value, key = null )
    {
        let opt = document.createElement("option");
        opt.value = value; 
        // opt.label = label;        
        opt.setAttribute("data-key", key);
        this._dataset.appendChild(opt);
    }

    get_selected_option() 
    {
        let value = this._input.value;
        let nodes = this._dataset.childNodes;
        for(let n = 0; n < nodes.length; n++)
        {
            let opt = nodes[n];
            if(opt.value == value )   
                return  { value: value, key: opt.getAttribute("data-key")};
        }
        
        return { value: value, key: null};
    }
    
    async prompt_selected()
    {        
        let is_submit = await this.run();
        if(is_submit && this._input.value != "") 
            return this.get_selected_option();
        throw new Error("User clicked cancel");
    }
    
}

customElements.define('dialog-datalist-prompt', Dialog_Datalist_Prompt);
window["Dialog_Datalist_Prompt"] = Dialog_Datalist_Prompt;