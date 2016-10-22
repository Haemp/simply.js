this.document.registerElement('sh-progress-bar', class ProgressBar extends HTMLElement{
    createdCallback(){
        const shadowRoot = this.attachShadow({mode: 'open'});

        shadowRoot.innerHTML = `
            <style>
                :host{
                    width: 100%;
                    margin: 0 auto;
                    max-width: 600px;
                    position: relative;
                    border-bottom: 1px solid rgb(106, 106, 106);
                    border-top: 1px solid rgb(39, 39, 39);
                    display: block;
                }
                .inner{
                    transition: 2.5s;
                    height: 6px;
                    position: absolute;
                    border-radius: 12px;
                    background-color: rgb(185, 138, 229);
                    top: -3px;
                    background-image: linear-gradient(#D3A4FF, #A475D0);
                }
                
                .percentage{
                    top: 9px;
                    width: 100%;
                    text-align:center;
                    position:absolute;
                }
            </style>
            <div #bar class="inner"></div>
            <div #percentage class="percentage"></div>
        `;

        Simply.compile(shadowRoot);
        this.s = shadowRoot;
    }

    /**
     * @api
     * @property
     * @name enabled
     * @type boolean
     */

    /**
     * @api
     * @param {Number} percentage
     */
    update(percentage){
        this.s.bar.style.width = (percentage * this.getBoundingClientRect().width) + 'px';
        this.s.percentage.innerText = Math.round(percentage * 100) + '%';
    }
});
