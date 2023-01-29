/**
 * External dependencies
 */
import { __ } from '@wordpress/i18n';
import {
	__experimentalWooProductSectionItem as WooProductSectionItem,
	__experimentalWooProductFieldItem as WooProductFieldItem,
	__experimentalProductSectionLayout as ProductSectionLayout,
	Link,
} from '@woocommerce/components';
import { registerPlugin } from '@wordpress/plugins';
import { recordEvent } from '@woocommerce/tracks';

/**
 * Internal dependencies
 */
import { AttributesField } from './index';
import { ATTRIBUTES_SECTION_ID, TAB_GENERAL_ID, PLUGIN_ID } from '../constants';

import './attributes-section.scss';

const AttributesSection = () => (
	<>
		<WooProductSectionItem
			id={ ATTRIBUTES_SECTION_ID }
			location={ TAB_GENERAL_ID }
			pluginId={ PLUGIN_ID }
			order={ 5 }
		>
			<ProductSectionLayout
				title={ __( 'Attributes', 'woocommerce' ) }
				className="woocommerce-product-attributes-section"
				description={
					<>
						<span>
							{ __(
								'Add descriptive pieces of information that customers can use to filter and search for this product.',
								'woocommerce'
							) }
						</span>
						<Link
							className="woocommerce-form-section__header-link"
							href="https://woocommerce.com/document/managing-product-taxonomies/#product-attributes"
							target="_blank"
							type="external"
							onClick={ () => {
								recordEvent(
									'learn_more_about_attributes_help'
								);
							} }
						>
							{ __(
								'Learn more about attributes',
								'woocommerce'
							) }
						</Link>
					</>
				}
			>
				<WooProductFieldItem.Slot section={ ATTRIBUTES_SECTION_ID } />
			</ProductSectionLayout>
		</WooProductSectionItem>
		<WooProductFieldItem
			id="attributes/add"
			section={ ATTRIBUTES_SECTION_ID }
			pluginId={ PLUGIN_ID }
			order={ 1 }
		>
			<AttributesField />
		</WooProductFieldItem>
	</>
);

registerPlugin( 'wc-admin-product-editor-attributes-section', {
	// @ts-expect-error 'scope' does exist. @types/wordpress__plugins is outdated.
	scope: 'woocommerce-product-editor',
	render: () => <AttributesSection />,
} );
