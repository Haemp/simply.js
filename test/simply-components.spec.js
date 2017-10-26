describe('Components', () => {
    it('Should handle components being defined out of order', (done) => {
        let wasRegistered = false;
        class Card extends Simply.Component{

            static get template(){
                return `
                    <header>{{ this.title }}</header>
                    <f-inner-card-x title="Inner Title"></f-inner-card-x>
                `;
            }

            static get props(){
                return ['title'];
            }

            connectedCallback(){
                this.title = this.getAttribute('title')
            }
        }

        class InnerCard extends Simply.Component{

            static get template(){
                return `
                    <header>{{ this.title }}</header>
                `;
            }

            static get props(){
                return ['title'];
            }

            connectedCallback(){
                console.log('reg')
                this.title = this.getAttribute('title')
                wasRegistered = this.title === 'Inner Title';
            }
        }

        Card.define('f-card-x')
        document.body.innerHTML = '<f-card-x></f-card-x>'

        // register in next event loop
        setTimeout(_ => {
            InnerCard.define('f-inner-card-x')
            expect(wasRegistered).toBe(true)
            done()
        })
    })
})
