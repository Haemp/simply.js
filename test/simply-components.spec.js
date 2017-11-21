describe('Components', () => {
    xit('Should handle components being defined out of order', (done) => {
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



    it('Should only trigger the connectedCallback once', () => {
        let cardConnected = 0;
        let innerCardConnected = 0;
        class Card extends Simply.Component{

            static get template(){
                return `
                    <header>{{ this.title }}</header>
                    <xx-inner-card title="Inner Title"></xx-inner-card>
                `;
            }

            static get props(){
                return ['title'];
            }

            connectedCallback(){
                cardConnected++;
            }
        }
        Card.define('xx-card');

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
                innerCardConnected++;
            }
        }

        InnerCard.define('xx-inner-card')

        document.body.innerHTML = '<xx-card></xx-card>'
        expect(cardConnected).toBe(1);
        expect(innerCardConnected).toBe(1);
    })
})
