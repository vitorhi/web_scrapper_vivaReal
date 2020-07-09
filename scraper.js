
const puppeteer = require('puppeteer');

// Funcao que clica e espera a abertura de nova aba
let clickAndWaitForTarget = async (clickSelector, page, browser) => {
  const pageTarget = page.target();
  await page.click(clickSelector);
  const newTarget = await browser.waitForTarget(target => target.opener() === pageTarget);
  const newPage = await newTarget.page();

  newPage.setViewport({
   width: 1920,
   height: 1080,
   isMobile: false
  });
  await newPage.waitForSelector("body");

  return newPage;
};

// Funcao principal de webscrapping
async function scrapeProduct(url,nome_bairro,readline){
	var list=[];
	const bairro = nome_bairro;
	const browser = await puppeteer.launch({headless: false});
	const page = await browser.newPage();

	page.setViewport({
	 width: 1920,
	 height: 1080,
	 isMobile: false
 	});

  // Digita o nome do bairro no campo
  await page.goto(url, { waitUntil: 'networkidle2'});
	await page.type('input[id="filter-location-search-input"]', bairro,{delay: 200});
	await page.type('input[id="filter-location-search-input"]', String.fromCharCode(13),{delay: 200});

  // Aguarda e retorna o número total de imóveis
  await page.waitForSelector('div[data-index="0"] > .property-card__container > .property-card__main-info > .property-card__main-link > .property-card__carousel > .carousel__container > .carousel__item-wrapper:nth-child(1) > .carousel__image');
  let total_imoveis= await page.evaluate(() => {
    let n=document.querySelector('div[class="results-summary__data"]>h1>strong').innerText;
    return n
  });

  // Parseia o numero de imoveis
  total_imoveis=total_imoveis.replace(/\D/g,'');
  total_imoveis= parseInt(total_imoveis,10);
  console.log("Número de imóveis disponíveis em "+bairro+": "+total_imoveis);

  // Calcula o numero de páginas totais
  n_pag_total=Math.floor(total_imoveis/35);
  n_imov_ultima=total_imoveis%35;
  if (n_imov_ultima != 0){
    n_pag_total++;
  }

  console.log("Número de páginas: "+n_pag_total+'\n');
  n_pag = readline.questionInt("Digite o numero de paginas a serem pesquisadas:")
  console.log("Número de páginas selecionadas: "+n_pag);

  // Iterando as paginas
  for (var j = 1; j <= n_pag; j++) {
    if(j>1){
      await page.click('div[class="js-results-pagination"]>div>ul>li>a[data-page="'+j+'"]',{ waitUntil: 'networkidle2'});

    }

    // Iterando os imoveis em cada pagina
  	for (var i = 0; i <= 35; i++) {
  		await page.waitForSelector('div[data-index="2"] > .property-card__container > .property-card__main-info > .property-card__main-link > .property-card__carousel > .carousel__container > .carousel__item-wrapper:nth-child(1) > .carousel__image')


  		page2=await clickAndWaitForTarget('div[data-index="'+ i +'"]> .property-card__container > .property-card__main-info',page, browser);
  		await page2.bringToFront();


  		let el=await page2.evaluate(() => {
  			let titulo = document.querySelector('div[class="title__content-wrapper"]>h1').innerText;
  			let aluguel = document.querySelector('div[class="price__content-wrapper"]>h3').innerText;
  			let condominio = document.querySelector('div[class="price__cta-wrapper"]>ul>li>span[class="price__list-value condominium js-condominium"]');
  			if (condominio!=null){
  				condominio=condominio.innerText;
  			}
  			let iptu = document.querySelector('div[class="price__cta-wrapper"]>ul>li>span[class="price__list-value iptu js-iptu"]');
  			if (iptu!=null){
  				iptu=iptu.innerText;
  			}
  			let n_quartos = document.querySelector('div[class="js-features"]>ul>li[title="Quartos"]');
        if (n_quartos!=null){
  				n_quartos=n_quartos.innerText;
  			}
  			return{
  				titulo,
  				aluguel,
  				condominio,
  				iptu,
  				n_quartos
  			};
  		});
      el=Object.assign({'bairro': bairro},el);
      list.push(el);
      console.log(el);
  		await page2.close();
  	}


  }

  // Fecha o Browser
  await browser.close();

  // Salva resultado em no arquivo out.json
  var fs = require('fs');
  fs.writeFile("out.json", JSON.stringify(list,null,2), function(err) {
      if (err) {
          console.log(err);
      }
  });
}

var readline = require('readline-sync');

// Seletor de bairros
const bairros = ['Barra Funda', 'Alto de Pinheiros', 'Bela Vista', 'Butanta', 'Jabaquara', 'Itaquera', 'Pinheiros','Lapa'];
bairros.sort();
index = readline.keyInSelect(bairros, 'Selecione o Bairro');
if(index<0){
  return -1;
}
console.log('Bairro selecionado: ' + bairros[index]+'\n');

scrapeProduct('https://www.vivareal.com.br/aluguel/?__vt=lgpd:a#__vt=lgpd:a',bairros[index],readline);
