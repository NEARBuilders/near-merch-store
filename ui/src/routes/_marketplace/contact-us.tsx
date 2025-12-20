import { createFileRoute } from '@tanstack/react-router';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Mail, Phone, MapPin } from 'lucide-react';

export const Route = createFileRoute('/_marketplace/contact-us')({
    component: ContactUs,
});

function ContactUs() {
    return (
        <div className="container mx-auto px-4 py-8 max-w-4xl">
            <h1 className="text-3xl font-bold mb-8 text-center">Contact Us</h1>

            <div className="grid md:grid-cols-2 gap-8">
                <div>
                    <Card>
                        <CardHeader>
                            <CardTitle>Get in Touch</CardTitle>
                            <CardDescription>
                                Fill out the form below and we'll get back to you as soon as possible.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
                                <div className="space-y-2">
                                    <label htmlFor="name" className="text-sm font-medium">Name</label>
                                    <Input id="name" placeholder="Your name" />
                                </div>

                                <div className="space-y-2">
                                    <label htmlFor="email" className="text-sm font-medium">Email</label>
                                    <Input id="email" type="email" placeholder="your@email.com" />
                                </div>

                                <div className="space-y-2">
                                    <label htmlFor="message" className="text-sm font-medium">Message</label>
                                    <Textarea id="message" placeholder="How can we help you?" rows={5} />
                                </div>

                                <Button type="submit" className="w-full">
                                    Send Message
                                </Button>
                            </form>
                        </CardContent>
                    </Card>
                </div>

                <div className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Other Ways to Reach Us</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex items-start space-x-3">
                                <Mail className="w-5 h-5 mt-0.5 text-primary" />
                                <div>
                                    <h3 className="font-medium">Email</h3>
                                    <p className="text-sm text-muted-foreground">support@nearmerch.com</p>
                                    <p className="text-sm text-muted-foreground">sales@nearmerch.com</p>
                                </div>
                            </div>

                            <div className="flex items-start space-x-3">
                                <Phone className="w-5 h-5 mt-0.5 text-primary" />
                                <div>
                                    <h3 className="font-medium">Phone</h3>
                                    <p className="text-sm text-muted-foreground">+1 (555) 123-4567</p>
                                    <p className="text-xs text-muted-foreground">Mon-Fri, 9am - 5pm EST</p>
                                </div>
                            </div>

                            <div className="flex items-start space-x-3">
                                <MapPin className="w-5 h-5 mt-0.5 text-primary" />
                                <div>
                                    <h3 className="font-medium">Address</h3>
                                    <p className="text-sm text-muted-foreground">
                                        123 Blockchain Blvd<br />
                                        Crypto City, CC 12345<br />
                                        United States
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>FAQ</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-sm text-muted-foreground mb-4">
                                Have a quick question? Check our Frequently Asked Questions page for immediate answers.
                            </p>
                            <Button variant="outline" asChild className="w-full">
                                <a href="/faq">Visit FAQ</a>
                            </Button>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
