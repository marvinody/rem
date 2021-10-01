import Xray from 'x-ray'

const x = Xray()

export const search = () => {
    return new Promise((resolve, rej) => {
        x('https://auctions.yahoo.co.jp/search/search?auccat=&tab_ex=commerce&ei=utf-8&aq=-1&oq=&sc_i=&p=%E6%9D%B1%E6%96%B9+%E3%81%B5%E3%82%82%E3%81%B5%E3%82%82&x=38&y=26', 'li.Product', [
            {
                title: '.Product__titleLink',
                price: 'span.Product__priceValue',
                image: 'img.Product__imageData@src'
            }
        ])
            .paginate('li.Pager__list--next > a@href')
            .limit(3)
            .then(function (res: any) {
                console.log(res[0]) // prints first result
                resolve(res)
            })
            .catch(function (err: Error) {
                console.log(err) // handle error in promise
                rej(err)
            })
    })
}