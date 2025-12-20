import { createFileRoute } from '@tanstack/react-router';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RefreshCcw, AlertTriangle, CheckCircle2 } from 'lucide-react';

export const Route = createFileRoute('/_marketplace/returns')({
    component: Returns,
});

function Returns() {
    return (
        <div className="container mx-auto px-4 py-8 max-w-4xl">
            <h1 className="text-3xl font-bold mb-4 text-center">Returns & Refunds</h1>
            <p className="text-center text-muted-foreground mb-10 max-w-2xl mx-auto">
                We want you to love your purchase. If you're not completely satisfied, we're here to help.
            </p>

            <div className="grid gap-8">
                <section>
                    <Card className="border-l-4 border-l-primary">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <RefreshCcw className="h-5 w-5" />
                                Return Policy Overview
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="mb-4">
                                You have <strong>30 calendar days</strong> to return an item from the date you received it.
                            </p>
                            <p className="mb-4">
                                To be eligible for a return, your item must be:
                            </p>
                            <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                                <li>Unused and in the same condition that you received it.</li>
                                <li>In the original packaging.</li>
                                <li>Accompanied by the receipt or proof of purchase.</li>
                            </ul>
                        </CardContent>
                    </Card>
                </section>

                <section className="grid md:grid-cols-2 gap-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <CheckCircle2 className="h-5 w-5 text-green-500" />
                                Refunds
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-sm text-muted-foreground">
                                Once we receive your item, we will inspect it and notify you that we have received your returned item. We will immediately notify you on the status of your refund after inspecting the item.
                            </p>
                            <p className="text-sm text-muted-foreground mt-4">
                                If your return is approved, we will initiate a refund to your original method of payment (credit card or crypto wallet). You will receive the credit within a certain amount of days, depending on your card issuer's policies.
                            </p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <AlertTriangle className="h-5 w-5 text-yellow-500" />
                                Exceptions
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-sm text-muted-foreground mb-4">
                                Some items cannot be returned:
                            </p>
                            <ul className="list-disc pl-5 space-y-1 text-sm text-muted-foreground">
                                <li>Perishable goods (e.g. food, flowers, newspapers)</li>
                                <li>Intimate or sanitary goods</li>
                                <li>Gift cards</li>
                                <li>Downloadable software products</li>
                            </ul>
                        </CardContent>
                    </Card>
                </section>

                <section className="bg-muted p-8 rounded-lg text-center">
                    <h2 className="text-2xl font-semibold mb-4">How to Start a Return</h2>
                    <div className="grid md:grid-cols-3 gap-4 text-left max-w-3xl mx-auto">
                        <div className="bg-background p-4 rounded shadow-sm">
                            <span className="block text-2xl font-bold text-primary mb-2">1</span>
                            <h3 className="font-medium mb-1">Log In</h3>
                            <p className="text-xs text-muted-foreground">Go to your account dashboard and find the order you wish to return.</p>
                        </div>
                        <div className="bg-background p-4 rounded shadow-sm">
                            <span className="block text-2xl font-bold text-primary mb-2">2</span>
                            <h3 className="font-medium mb-1">Request Return</h3>
                            <p className="text-xs text-muted-foreground">Click "Return Item" next to the product and select the reason.</p>
                        </div>
                        <div className="bg-background p-4 rounded shadow-sm">
                            <span className="block text-2xl font-bold text-primary mb-2">3</span>
                            <h3 className="font-medium mb-1">Ship It</h3>
                            <p className="text-xs text-muted-foreground">Print the prepaid shipping label and drop off the package.</p>
                        </div>
                    </div>

                    <div className="mt-8">
                        <Button size="lg">Start a Return</Button>
                    </div>
                </section>

                <section className="text-center">
                    <p className="text-sm text-muted-foreground">
                        Questions about your return? <a href="/contact-us" className="text-primary hover:underline">Contact Us</a>
                    </p>
                </section>
            </div>
        </div>
    );
}
