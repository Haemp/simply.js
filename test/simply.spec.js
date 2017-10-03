
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
            console.log(document.body);
            document.body.$.potato.click();
            expect(document.body.potatoFunction.calls.count()).toBe(1);
            
            // switch over to the other view
            document.body.potato = false;
            render(document.body)

            // re-render the view switching the potato value
            document.body.$.noPotato.click();
            console.log(document.body.$.noPotato.listeners)
            expect(document.body.potatoFunction.calls.count()).toBe(1);
        })
    })
})
