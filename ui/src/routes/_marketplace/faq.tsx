import { createFileRoute } from '@tanstack/react-router';
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from '@/components/ui/accordion';

export const Route = createFileRoute('/_marketplace/faq')({
    component: FAQ,
});

function FAQ() {
    return (
        <div className="container mx-auto px-4 py-8 max-w-3xl">
            <h1 className="text-3xl font-bold mb-4 text-center">Frequently Asked Questions</h1>
            <p className="text-center text-muted-foreground mb-10">
                Find answers to the most common questions about our products and services.
            </p>

            <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="item-1">
                    <AccordionTrigger>What payment methods do you accept?</AccordionTrigger>
                    <AccordionContent>
                        We accept major credit cards (Visa, MasterCard, American Express), PayPal, and of course, NEAR tokens! You can connect your NEAR wallet at checkout to pay with crypto.
                    </AccordionContent>
                </AccordionItem>

                <AccordionItem value="item-2">
                    <AccordionTrigger>Do you ship internationally?</AccordionTrigger>
                    <AccordionContent>
                        Yes, we ship to most countries worldwide. International shipping rates vary based on location and weight of the package. Please see our Shipping Info page for more details.
                    </AccordionContent>
                </AccordionItem>

                <AccordionItem value="item-3">
                    <AccordionTrigger>How can I track my order?</AccordionTrigger>
                    <AccordionContent>
                        Once your order has been shipped, you will receive an email with a tracking number. You can also log in to your account and view your order history to check the status of your shipment.
                    </AccordionContent>
                </AccordionItem>

                <AccordionItem value="item-4">
                    <AccordionTrigger>What is your return policy?</AccordionTrigger>
                    <AccordionContent>
                        We offer a 30-day return policy for unused and unworn items in their original packaging. Please visit our Returns page for detailed information on how to initiate a return.
                    </AccordionContent>
                </AccordionItem>

                <AccordionItem value="item-5">
                    <AccordionTrigger>Can I change or cancel my order?</AccordionTrigger>
                    <AccordionContent>
                        If you need to make changes to your order, please contact us immediately at support@nearmerch.com. We process orders quickly, so we cannot guarantee that we will be able to modify your order once it has been placed.
                    </AccordionContent>
                </AccordionItem>

                <AccordionItem value="item-6">
                    <AccordionTrigger>Are the products official NEAR merchandise?</AccordionTrigger>
                    <AccordionContent>
                        Yes! All products listed on our store are officially licensed NEAR merchandise, created in partnership with the NEAR Foundation and community artists.
                    </AccordionContent>
                </AccordionItem>

                <AccordionItem value="item-7">
                    <AccordionTrigger>How do I connect my NEAR wallet?</AccordionTrigger>
                    <AccordionContent>
                        Click the "Connect Wallet" button in the top right corner of the site. We support MyNearWallet, Meteor Wallet, and other standard NEAR wallets.
                    </AccordionContent>
                </AccordionItem>
            </Accordion>

            <div className="mt-12 text-center">
                <p className="text-muted-foreground">
                    Still have questions? <a href="/contact-us" className="text-primary hover:underline">Contact Us</a>
                </p>
            </div>
        </div>
    );
}
