'use strict';

const stripe = require('stripe')(process.env.STRIPE_KEY);

/**
 * order controller
 */

const { createCoreController } = require('@strapi/strapi').factories;

module.exports = createCoreController('api::order.order', ({strapi}) => ({
    async create(ctx) {
        const { cart, discount, shipping_fee } = ctx.request.body;

        try {
            const lineItems = await Promise.all(
                cart.map(async (product) => {
                    const item = await strapi.service('api::product.product').findOne(parseInt(product.id.replace(product.color, '')));

                    return {
                        price_data: {
                            currency: 'hkd',
                            product_data: {
                                name: item.title,
                            },
                            unit_amount: item.price * 100,
                        },
                        quantity: product.quantity,
                    };
                })
            );

            const session = await stripe.checkout.sessions.create({
                line_items: lineItems,
                mode: 'payment',
                success_url: process.env.CLIENT_URL + '?success=true',
                cancel_url: process.env.CLIENT_URL + '?success=false',
            });


            await strapi.service('api::order.order').create({data:{
                products: {
                    cart,
                    discount,
                    shipping_fee,
                }, 
                stripeid: session.id,
            }});

            return { stripeSession: session };
            

        } catch (error) {
            ctx.response.status = 500;
            return error;
        }
    }
}));
