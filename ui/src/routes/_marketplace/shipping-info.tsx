import { createFileRoute } from '@tanstack/react-router';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Truck, Globe, Clock, Package } from 'lucide-react';

export const Route = createFileRoute('/_marketplace/shipping-info')({
    component: ShippingInfo,
});

function ShippingInfo() {
    return (
        <div className="container mx-auto px-4 py-8 max-w-4xl">
            <h1 className="text-3xl font-bold mb-2 text-center">Shipping Information</h1>
            <p className="text-center text-muted-foreground mb-10 max-w-2xl mx-auto">
                Everything you need to know about how we deliver your NEAR merchandise.
            </p>

            <div className="grid gap-8">
                <section>
                    <div className="grid md:grid-cols-2 gap-6">
                        <Card>
                            <CardHeader className="flex flex-row items-center gap-4 space-y-0 pb-2">
                                <Truck className="h-6 w-6 text-primary" />
                                <CardTitle className="text-lg">Domestic Shipping</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground mb-4">
                                    We offer reliable shipping across the United States via USPS, UPS, and FedEx.
                                </p>
                                <ul className="text-sm space-y-2">
                                    <li className="flex justify-between">
                                        <span>Standard (5-7 business days)</span>
                                        <span className="font-semibold">$5.99</span>
                                    </li>
                                    <li className="flex justify-between">
                                        <span>Expedited (2-3 business days)</span>
                                        <span className="font-semibold">$12.99</span>
                                    </li>
                                    <li className="flex justify-between">
                                        <span>Overnight (1 business day)</span>
                                        <span className="font-semibold">$24.99</span>
                                    </li>
                                </ul>
                                <div className="mt-4 pt-4 border-t">
                                    <p className="text-sm font-medium text-green-600">
                                        Free standard shipping on orders over $50!
                                    </p>
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader className="flex flex-row items-center gap-4 space-y-0 pb-2">
                                <Globe className="h-6 w-6 text-primary" />
                                <CardTitle className="text-lg">International Shipping</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground mb-4">
                                    We ship to over 50 countries worldwide. Delivery times vary by location.
                                </p>
                                <ul className="text-sm space-y-2">
                                    <li className="flex justify-between">
                                        <span>Canada & Mexico</span>
                                        <span className="font-semibold">Starting at $15.00</span>
                                    </li>
                                    <li className="flex justify-between">
                                        <span>Europe & UK</span>
                                        <span className="font-semibold">Starting at $20.00</span>
                                    </li>
                                    <li className="flex justify-between">
                                        <span>Asia & Pacific</span>
                                        <span className="font-semibold">Starting at $25.00</span>
                                    </li>
                                </ul>
                                <div className="mt-4 pt-4 border-t">
                                    <p className="text-xs text-muted-foreground">
                                        *Customs duties and taxes are not included in the shipping price.
                                    </p>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </section>

                <section className="space-y-6">
                    <h2 className="text-2xl font-semibold">Shipping Policies</h2>

                    <div className="grid md:grid-cols-2 gap-6">
                        <div className="flex gap-4">
                            <div className="bg-primary/10 p-3 rounded-full h-fit">
                                <Clock className="h-6 w-6 text-primary" />
                            </div>
                            <div>
                                <h3 className="font-semibold mb-2">Processing Time</h3>
                                <p className="text-sm text-muted-foreground">
                                    Orders are processed within 1-2 business days. Orders placed on weekends or holidays will be processed the next business day. You will receive a confirmation email with tracking once your order ships.
                                </p>
                            </div>
                        </div>

                        <div className="flex gap-4">
                            <div className="bg-primary/10 p-3 rounded-full h-fit">
                                <Package className="h-6 w-6 text-primary" />
                            </div>
                            <div>
                                <h3 className="font-semibold mb-2">Order Tracking</h3>
                                <p className="text-sm text-muted-foreground">
                                    Once your order ships, you will receive an email with a tracking number. You can track your package directly on the carrier's website or via our Order Status page.
                                </p>
                            </div>
                        </div>
                    </div>
                </section>

                <section className="bg-muted p-6 rounded-lg">
                    <h3 className="text-lg font-semibold mb-2">Note on Pre-orders</h3>
                    <p className="text-sm text-muted-foreground">
                        Items marked as "Pre-order" will ship on the estimated availability date shown on the product page. If your order contains both in-stock and pre-order items, we may split the shipment or wait until all items are available, depending on your preference selected at checkout.
                    </p>
                </section>
            </div>
        </div>
    );
}
