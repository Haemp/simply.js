describe('Simply.js', () => {

    it('Should render template text values', () => {
        const message = 'Yo waddap?'
        const render = Simply.compileTemplate('<em>{{ this.message }}</em>')
        const div = document.createElement('div');
        div.message = message;
        render(div);
        const renderedHtml = div.querySelector('em')

        expect(renderedHtml).toBeTruthy();
        expect(renderedHtml.innerText).toBe(message);
    })

    describe('Attributes', function(){
        it('Should render object properties', function(){

        })

        it('Should interpolate attribute values wrapped in {}', function(){

        })
    })
})
