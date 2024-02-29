const puppeteer = require('puppeteer');
const fs = require('fs');

const url = process.argv[2];
const geoposition = process.argv[3];

async function isTruePage(page) {
    const selectorError = ".UiErrorNotFoundBase_root___2Yjy"
    const elem = await page.$(selectorError);
    return elem != null
}

async function isCurrentGeo(geo) {
    return geo===geoposition;
}

async function setGeoposition(page) {
    const selectorGeoposition = '.Region_region__6OUBn';
    await page.waitForSelector(selectorGeoposition);
    await page.click(selectorGeoposition);
    const selectorLiGeo = ".UiRegionListBase_item___ly_A";
    await page.waitForSelector(selectorLiGeo);
    const li = await page.$$eval(selectorLiGeo, async arLi => {
        for (const li of arLi) {
            if(await isCurrentGeo(li.textContent)) {
                li.click()
                return li.textContent
            }
        }
        return false
    });
    if(!li) {
        console.log("Ошибка смены локации: нет такой локации")
        return
    }
    await page.waitForNavigation('load');
}

async function getScreenshot(page) {
    const selectorBtnClose = ".Tooltip_closeIcon__skwl0";
    await page.waitForSelector(selectorBtnClose);
    await page.click(selectorBtnClose);
    await page.screenshot({path: 'screenshot.png'});;
}

async function getInfoProduct(page) {
    const selectorRate = ".Rating_value__S2QNR";
    const rate = await page.$eval(selectorRate,span=>span.textContent)
    const selectorReviews = ".ActionsRow_button__g8vnK";
    const reviews = String(await page.$eval(selectorReviews,span=>span.textContent)).split(' ')[0];
    const selectorNone = ".OutOfStockInformer_informer__NCD7v";
    const spanNone = await page.$(selectorNone);
    if(spanNone)
        return {rate: rate, reviews: reviews, price: null, oldPrice: null}
    const selectorPrice = ".Price_size_XL__MHvC1";
    const spanPrice = await page.$(selectorPrice);
    const price = async () =>{
        if(spanPrice) 
            return String(await spanPrice.evaluate(span=>span.textContent)).split(' ')[0]
        else return false
    }
    const selectorOldPrice = ".Price_price__QzA8L";
    const spanOldPrice = await page.$(selectorOldPrice);
    const oldPrice = async () =>{
        if(spanOldPrice)
            return String(await spanOldPrice.evaluate(span=>span.textContent)).split(' ')[0]
        else return false
    }
    return {rate: rate, reviews: reviews, price:await price(), oldPrice: await oldPrice()}
}

function writeInfo(infoProduct) {
    let info = "Информация о товаре: "+"\n"+
        "Рейтинг: "+infoProduct.rate+"\n"+
        "Количество отзывов: "+infoProduct.reviews+"\n"+
        "Цена: ";
    if(infoProduct.price==null) info += "Нет в наличии"
    else info += infoProduct.price;
    if(infoProduct.oldPrice) info += "\nЦена без скидки: "+infoProduct.oldPrice 
    fs.appendFile('product.txt',info+'\n', function (err) {
        if (err) throw err;
    })
}

(async ()=>{
    const browser = await puppeteer.launch({ headless: false,
        defaultViewport: null,
        args: ['--start-maximized',
    ]});
    const context = browser.defaultBrowserContext();
    await context.overridePermissions(url, ['notifications']);
    const page = await browser.newPage();
    await page.goto(url);
    await page.waitForNavigation('load');
    await page.exposeFunction("isCurrentGeo", isCurrentGeo);
    await setGeoposition(page);
    await getScreenshot(page);
    const infoProduct = await getInfoProduct(page);
    writeInfo(infoProduct);
}) ();
