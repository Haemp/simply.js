
describe('Simply.js', () => {

    describe('Rules', () => {

        it('Should append click listeners ', () => {
            const render = Simply.compileTemplate('<button (click)="this.clickMe()">Click me</button>')
            const div = document.createElement('div');
            div.clickMe = () => {};
            const spy = spyOn(div, 'clickMe');

            render(div);
            div.querySelector('button').click();

            expect(div.clickMe).toHaveBeenCalled();
        });

        it('Should render template text values', () => {
            const message = 'Yo waddap?';
            const render = Simply.compileTemplate('<em>{{ this.message }}</em>');
            const div = document.createElement('div');
            div.message = message;
            render(div);
            const renderedHtml = div.querySelector('em');

            expect(renderedHtml).toBeTruthy();
            expect(renderedHtml.innerText).toBe(message);

            div.remove();
        });

        it('Should render undefined text values as empty strings', () => {

            const render = Simply.compileTemplate('<em>{{ this.undefinedVariable }}</em>');
            const div = document.createElement('div');
            render(div);

            const renderedHtml = div.querySelector('em');
            expect(renderedHtml.innerText).toEqual('');

            div.remove();
        });

        describe('Rendering', () => {
            afterEach(() => {
                document.body.innerHTML = ''
            })
            /**
             * The issue behind this was solved by adding unique IDs for each element rendered
             */
            it('Should not reuse the underlying object when re-rendering similar components', () => {
                const render = Simply.compileTemplate(`
                <div if="this.potato" #potato (click)="this.potatoFunction()">
                    potato
                </div>
                <div #no-potato if="!this.potato" id="no-potato" >
                    no potato
                </div>
            `)

                document.body.potato = true;
                document.body.potatoFunction = () => {};
                spyOn(document.body, 'potatoFunction');
                render(document.body)
                document.body.$.potato.click();
                expect(document.body.potatoFunction.calls.count()).toBe(1);

                // switch over to the other view
                document.body.potato = false;
                render(document.body)

                // re-render the view switching the potato value
                document.body.$.noPotato.click();
                expect(document.body.potatoFunction.calls.count()).toBe(1);
            })

        })

        it('Should automatically re-render defined properties', () => {
            class CustomComponentA extends Simply.Component {
                static get template(){
                    return `<div>{{ this.prop }}</div>`;
                }
                static get props(){
                    return ['prop']
                }
            }
            CustomComponentA.define('x-custom-component-a')

            // the render method should be called
            // once the component is added
            const customComponent = new CustomComponentA();
            spyOn(customComponent, 'render')
            document.body.appendChild(customComponent)
            expect(customComponent.render.calls.count()).toBe(1)

            // and then once more when we change a property
            customComponent.prop = 'yo!';
            expect(customComponent.render.calls.count()).toBe(2)
        })
    })

    describe('Components', () => {

        it('Should have post-compile values available in the connectedCallback handler', () => {
            let title = '';
            class InnerCard extends Simply.Component{

                static get template(){
                    return `
                        <header>{{ this.getAttribute('title') }}</header>
                    `;
                }

                connectedCallback(){
                    title = this.getAttribute('title');
                }
            }

            class Card extends Simply.Component{

                static get template(){
                    return `
                        <f-inner-card title="ThisTitle"></f-inner-card>
                    `;
                }
            }

            InnerCard.define('f-inner-card')
            Card.define('f-card')
            document.body.innerHTML = '<f-card></f-card>';
            expect(title).toBe('ThisTitle');
        })

        it('Should have post-compile values available in the connectedCallback handler', () => {
            let connectedCallbackCalled = false;
            class Card extends Simply.Component{

                static get template(){
                    return `
                        <div>asda</div>
                    `;
                }

                connectedCallback(){
                    connectedCallbackCalled = true;
                }
            }
            Card.define('f-card')
            document.body.innerHTML = '<f-card></f-card>';
            expect(connectedCallbackCalled).toBe(true);
        })
    })
})
