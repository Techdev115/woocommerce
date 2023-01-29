const { test, expect } = require( '@playwright/test' );
const wcApi = require( '@woocommerce/woocommerce-rest-api' ).default;

const firstProductName = 'First Product';
const firstProductPrice = '9.99';
const secondProductName = 'Second Product';
const secondProductPrice = '4.99';
const fourProductsTotal = +firstProductPrice * 4;
const twoProductsTotal = +firstProductPrice + +secondProductPrice;
const firstProductWithFlatRate = +firstProductPrice + 5;
const fourProductsWithFlatRate = +fourProductsTotal + 5;
const twoProductsWithFlatRate = +twoProductsTotal + 5;

const shippingZoneNameDE = 'Germany Free Shipping';
const shippingCountryDE = 'DE';
const shippingZoneNameFR = 'France Flat Local';
const shippingCountryFR = 'FR';

test.describe( 'Cart Calculate Shipping', () => {
	let firstProductId, secondProductId, shippingZoneDEId, shippingZoneFRId;

	test.beforeAll( async ( { baseURL } ) => {
		const api = new wcApi( {
			url: baseURL,
			consumerKey: process.env.CONSUMER_KEY,
			consumerSecret: process.env.CONSUMER_SECRET,
			version: 'wc/v3',
		} );
		// make sure the currency is USD
		await api.put( 'settings/general/woocommerce_currency', {
			value: 'USD',
		} );
		// add products
		await api
			.post( 'products', {
				name: firstProductName,
				type: 'simple',
				regular_price: firstProductPrice,
			} )
			.then( ( response ) => {
				firstProductId = response.data.id;
			} );
		await api
			.post( 'products', {
				name: secondProductName,
				type: 'simple',
				regular_price: secondProductPrice,
			} )
			.then( ( response ) => {
				secondProductId = response.data.id;
			} );
		// create shipping zones
		await api
			.post( 'shipping/zones', {
				name: shippingZoneNameDE,
			} )
			.then( ( response ) => {
				shippingZoneDEId = response.data.id;
			} );
		await api
			.post( 'shipping/zones', {
				name: shippingZoneNameFR,
			} )
			.then( ( response ) => {
				shippingZoneFRId = response.data.id;
			} );
		// set shipping zone locations
		await api.put( `shipping/zones/${ shippingZoneDEId }/locations`, [
			{
				code: shippingCountryDE,
			},
		] );
		await api.put( `shipping/zones/${ shippingZoneFRId }/locations`, [
			{
				code: shippingCountryFR,
			},
		] );
		// set shipping zone methods
		await api.post( `shipping/zones/${ shippingZoneDEId }/methods`, {
			method_id: 'free_shipping',
		} );
		await api.post( `shipping/zones/${ shippingZoneFRId }/methods`, {
			method_id: 'flat_rate',
			settings: {
				cost: '5.00',
			},
		} );
		await api.post( `shipping/zones/${ shippingZoneFRId }/methods`, {
			method_id: 'local_pickup',
		} );
		// confirm that we allow shipping to any country
		await api.put( 'settings/general/woocommerce_allowed_countries', {
			value: 'all',
		} );
	} );

	test.beforeEach( async ( { page, context } ) => {
		// Shopping cart is very sensitive to cookies, so be explicit
		await context.clearCookies();

		// all tests use the first product
		await page.goto( `/shop/?add-to-cart=${ firstProductId }` );
		await page.waitForLoadState( 'networkidle' );
	} );

	test.afterAll( async ( { baseURL } ) => {
		const api = new wcApi( {
			url: baseURL,
			consumerKey: process.env.CONSUMER_KEY,
			consumerSecret: process.env.CONSUMER_SECRET,
			version: 'wc/v3',
		} );
		await api.delete( `products/${ firstProductId }`, {
			force: true,
		} );
		await api.delete( `products/${ secondProductId }`, {
			force: true,
		} );
		await api.delete( `shipping/zones/${ shippingZoneDEId }`, {
			force: true,
		} );
		await api.delete( `shipping/zones/${ shippingZoneFRId }`, {
			force: true,
		} );
	} );

	test( 'allows customer to calculate Free Shipping if in Germany', async ( {
		page,
	} ) => {
		await page.goto( '/cart/' );
		// Set shipping country to Germany
		await page.click( 'a.shipping-calculator-button' );
		await page.selectOption( '#calc_shipping_country', shippingCountryDE );
		await page.click( 'button[name="calc_shipping"]' );

		// Verify shipping costs
		await expect(
			page.locator( '.shipping ul#shipping_method > li' )
		).toContainText( 'Free shipping' );
		await expect( page.locator( '.order-total .amount' ) ).toContainText(
			firstProductPrice
		);
	} );

	test( 'allows customer to calculate Flat rate and Local pickup if in France', async ( {
		page,
	} ) => {
		await page.goto( '/cart/' );
		// Set shipping country to France
		await page.click( 'a.shipping-calculator-button' );
		await page.selectOption( '#calc_shipping_country', shippingCountryFR );
		await page.click( 'button[name="calc_shipping"]' );

		// Verify shipping costs
		await expect( page.locator( '.shipping .amount' ) ).toContainText(
			'$5.00'
		);
		await expect( page.locator( '.order-total .amount' ) ).toContainText(
			`$${ firstProductWithFlatRate }`
		);

		// Set shipping to local pickup instead of flat rate
		await page.click( 'text=Local pickup' );

		// Verify updated shipping costs
		await expect( page.locator( '.order-total .amount' ) ).toContainText(
			`$${ firstProductPrice }`
		);
	} );

	test( 'should show correct total cart price after updating quantity', async ( {
		page,
	} ) => {
		await page.goto( '/cart/' );
		await page.fill( 'input.qty', '4' );
		await page.click( 'text=Update cart' );

		// Set shipping country to France
		await page.click( 'a.shipping-calculator-button' );
		await page.selectOption( '#calc_shipping_country', shippingCountryFR );
		await page.click( 'button[name="calc_shipping"]' );

		await expect( page.locator( '.order-total .amount' ) ).toContainText(
			`$${ fourProductsWithFlatRate }`
		);
	} );

	test( 'should show correct total cart price with 2 products and flat rate', async ( {
		page,
	} ) => {
		await page.goto( `/shop/?add-to-cart=${ secondProductId }` );
		await page.waitForLoadState( 'networkidle' );

		await page.goto( '/cart/' );
		await page.click( 'a.shipping-calculator-button' );
		await page.selectOption( '#calc_shipping_country', shippingCountryFR );
		await page.click( 'button[name="calc_shipping"]' );

		await expect( page.locator( '.shipping .amount' ) ).toContainText(
			'$5.00'
		);
		await expect( page.locator( '.order-total .amount' ) ).toContainText(
			`$${ twoProductsWithFlatRate }`
		);
	} );

	test( 'should show correct total cart price with 2 products without flat rate', async ( {
		page,
	} ) => {
		await page.goto( `/shop/?add-to-cart=${ secondProductId }` );
		await page.waitForLoadState( 'networkidle' );

		// Set shipping country to Spain
		await page.goto( '/cart/' );
		await page.click( 'a.shipping-calculator-button' );
		await page.selectOption( '#calc_shipping_country', 'ES' );
		await page.click( 'button[name="calc_shipping"]' );

		// Verify shipping costs
		await expect( page.locator( '.order-total .amount' ) ).toContainText(
			`$${ twoProductsTotal }`
		);
	} );
} );
