export class Dialog_GenericNotification extends HTMLElement
{
    
    constructor()
    {
        super()
        this.node = document.createElement("dialog");
        this.submit_callback = (flag) => { alert("Submit Clicked"); }
        this.close_callback = () => { };
        this.custom_style = "";

        var html = `
            <div>    
                <div>            
                    <h4 id="dialog-title">Dialog Title</h4>
                    <span id="dialog-text">Dialog Text</span>
                </div>

                <div id="dialog-body"> 
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
            this.submit_callback(true);            
        });
    }


    connectedCallback()
    {
        var window_width = window.innerWidth > 600 ? "500px" : "90%";
        var window_height = window.innerHeight > 1000 ? "600px" : "95%";
        //alert(" Window width = ", window_width);

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

                ${this.custom_style}
            </style>            
        `.trim();

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

    setCustomStyle(style)
    {
        this.custom_style = style;
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

    onClose(callback) {
        this.close_callback = callback;
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

    appendBodyWidget(domElement)
    {
        this.node.querySelector("#dialog-body").appendChild(domElement);
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

    show() { this.node.showModal(true); }
    hide() { this.node.close(); this.close_callback();   }
    close(){ this.node.close(); this.close_callback();   }

    setVisible(flag) 
    {
        if(flag) 
            this.show();
        else
            this.close();
    }


} // --- End of class Dialog_GenericNotification -------------//

customElements.define('dialog-generic', Dialog_GenericNotification);


export class Dialog_OkCancel extends Dialog_GenericNotification
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


export class Dialog_Prompt extends Dialog_GenericNotification
{
    constructor(){
        super()
        this.attachShadow( { mode: 'open' } )

        this.setTitle("Prompt:");
        // this.setText("Are you sure you want to delete this item?");
        this.setButtonSubmitLabel("Submit");
        this.setButtonCloseLabel("Cancel");

        this.input = this.insertBodyHtml(`<input id="question-entry"></input>`);
        
        if(screen.width <= 500)
            this.node.style["width"] = "80%";
        else 
            this.node.style["width"] = "500px";
        
        this.input.style["width"] = "90%";

        this.onSubmit( (flag) => {
            console.log(" [INFO] User clicked submit ? = ", flag);
            this.close();
        });
    }

    setInput(text)
    {
        this.input.value = text;
    }

    get_answer() 
    {
        return this.input.value;
    }

    prompt(title, question, callback)
    {
        this.setTitle(title);
        this.setInput(question);
        // this.input.value = "";

        this.onSubmit(flag => {
            if(!flag) return;
            let answer = this.input.value;
            if(answer == ""){ this.close(); return;}
            callback(answer);            
            this.close();
        });
        this.show();
    }

    prompt_promise(title, question)
    {
        this.setTitle(title);
        this.setInput(question);
        // this.input.value = "";
        this.show();

        let p = new Promise( (resolve, reject) => {
            this.onSubmit( flag => {
                if(!flag) reject();

                let answer = this.input.value;
                if(answer == ""){ 
                    reject(); 
                    this.close(); 
                    return;
                }
                if(flag) resolve(answer);
                this.close();
            });
        });

        return p;
    }
}

customElements.define('dialog-prompt', Dialog_Prompt);
window["Dialog_Prompt"] = Dialog_Prompt;


export class DialogFormBuilder extends Dialog_GenericNotification 
{
   
    constructor()
    {
        super()
        this.attachShadow( { mode: 'open' } )

        this.onSubmit(() => alert("Submit Clicked") );


        var html = `
                <table> 
                    <tbody>

                    </tbody>
                </table>
        `.trim();

        var el       = document.createElement("template");
        el.innerHTML = html;
        var elem     = el.content.firstChild;
                
       this.appendBodyWidget(elem);

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

}

customElements.define('dialog-formbuilder', DialogFormBuilder);


export class DialogForm extends Dialog_GenericNotification 
{
   
    constructor()
    {
        super()
        this.attachShadow( { mode: 'open' } )
        this.created_widgets = {}

        this.confirm_callback = (response) => {};

/*         this.onSubmit((is_ok) => {
            if(!is_ok) { 
                this.confirm_callback(null); 
                return;
            }

            this.confirm_callback(this);
        });
 */

        var html = `
                <table> 
                    <tbody>

                    </tbody>
                </table>
        `.trim();

        var el       = document.createElement("template");
        el.innerHTML = html;
        var elem     = el.content.firstChild;
                
       this.appendBodyWidget(elem);

    }

    get_widget(key){
        return this.created_widgets[key];
    }

    onConfirm()
    {
        var p = new Promise( (resolve, reject) => {
            this.onSubmit( (flag) => { 
                if(!flag) reject();
                if(flag)  resolve(this);
             })
        });
        return p; 
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


/* ---------- Generic Dialog ----------------- */ 


export class Dialog_Basic extends HTMLElement
{
    constructor()
    {
        super()
        this.attachShadow( { mode: 'open' } )

        this.node = document.createElement("dialog");
        this._callback = (flag) => { alert("Submit Clicked"); }
        this.custom_style = "";

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
            this._callback(false);
            this.node.close();
            this.detach_body();
        });

        this.node.querySelector("#btn-submit").addEventListener("click", () => {             
            this._callback(true);            
            this.node.close();
            this.detach_body();
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

                input {
                    width: 100%;
                }

            </style>            
        `.trim();

        this.shadowRoot.appendChild(this.node);
    }

    detach_body() 
    {
        this.parentNode.removeChild(this);
    }

    attach_body()
    {
        document.body.appendChild(this)
    }

    show() { this.node.showModal(true); }
    hide() { this.node.close();         }
    close(){ this.node.close();         }

    run() 
    {
        this.show();
        let p = new Promise( (resolve, reject) => {
            this._callback = (flag) => {
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


} // ---- Dialog_Basic class ---------------// 

customElements.define('dialog-basic', Dialog_Basic);
window["dialog-basic"] = Dialog_Basic;


/** ============ Nortification Dialog ============= */


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

}

customElements.define('dialog2-notify', Dialog_Notify);
window["dialog2-notify"] = Dialog_Notify;

/** Non-Stateful prompt dialog, similar to function prompt();
 */
export class Dialog2_Prompt extends Dialog_Basic
{
    constructor(title, text, input = "")
    {
        super()
        // this.attachShadow( { mode: 'open' } )

        this.input = this.insertBodyHtml("<input id='dialog-input'></input>");
        this.input.value = input;
        //input = this.node.querySelector("#dialog-input");
                
        this.setTitle(title);
        this.setText(text);
        
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