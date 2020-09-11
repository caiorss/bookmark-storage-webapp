export class Dialog_GenericNotification extends HTMLElement
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

    appendBodyWidget(domElement)
    {
        this.node.querySelector("#dialog-body").appendChild(domElement);
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

/**
 * Usage: 
 * ```
 *   var c = new NotificationDialog();
 *   c.attach(document.body);
 *   // Timeout 1 second (= 1000 milliseconds)
 *   c.notify("My notifcation", 1000);
 * ```
 */
export class NotificationDialog extends Dialog_GenericNotification 
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

