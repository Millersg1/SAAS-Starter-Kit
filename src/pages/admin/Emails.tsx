import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button, Card, CardHeader, CardTitle, CardContent, Badge } from "@/components/ui";
import { useToast } from "@/hooks/use-toast";

interface EmailTemplate {
    id: number;
    slug: string;
    name: string;
    subject: string;
    body_html: string;
    variables: string[];
    updated_at: string;
}

function TemplateSkeleton() {
    return (
        <div className="space-y-4">
            {[1, 2, 3].map((i) => (
                <Card key={i}>
                    <CardContent className="p-6">
                        <div className="animate-pulse space-y-3">
                            <div className="h-5 w-32 bg-slate-200 rounded"></div>
                            <div className="h-4 w-48 bg-slate-200 rounded"></div>
                        </div>
                    </CardContent>
                </Card>
            ))}
        </div>
    );
}

export default function EmailTemplatesPage() {
    const [templates, setTemplates] = useState<EmailTemplate[]>([]);
    const [loading, setLoading] = useState(true);
    const [editingTemplate, setEditingTemplate] = useState<EmailTemplate | null>(null);
    const [saving, setSaving] = useState(false);
    const { toast } = useToast();

    useEffect(() => {
        loadTemplates();
    }, []);

    async function loadTemplates() {
        try {
            // Use 'as any' to bypass TypeScript strict type checking for dynamic table access
            const { data, error } = await (supabase as any)
                .from("email_templates")
                .select("*")
                .order("name", { ascending: true });

            if (error) throw error;
            setTemplates((data || []) as EmailTemplate[]);
        } catch (error) {
            console.error("Failed to load templates:", error);
        } finally {
            setLoading(false);
        }
    }

    async function saveTemplate() {
        if (!editingTemplate) return;
        setSaving(true);

        try {
            // Use 'as any' to bypass TypeScript strict type checking for dynamic table access
            const { error } = await (supabase as any)
                .from("email_templates")
                .update({
                    subject: editingTemplate.subject,
                    body_html: editingTemplate.body_html,
                    updated_at: new Date().toISOString(),
                })
                .eq("id", editingTemplate.id);

            if (error) throw error;
            toast({ title: "Template saved successfully" });
            setEditingTemplate(null);
            loadTemplates();
        } catch (error) {
            toast({
                title: "Failed to save template",
                variant: "destructive",
            });
        } finally {
            setSaving(false);
        }
    }

    // Editor View
    if (editingTemplate) {
        return (
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold">{editingTemplate.name}</h1>
                        <p className="text-slate-500">Edit email template content</p>
                    </div>
                    <div className="flex gap-2">
                        <Button variant="outline" onClick={() => setEditingTemplate(null)}>
                            Cancel
                        </Button>
                        <Button onClick={saveTemplate} disabled={saving}>
                            {saving ? "Saving..." : "Save Changes"}
                        </Button>
                    </div>
                </div>

                {/* Variables Reference */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-sm">Available Variables</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex flex-wrap gap-2">
                            {editingTemplate.variables?.map((v) => (
                                <Badge key={v} className="bg-slate-100 text-slate-700">
                                    {"{{" + v + "}}"}
                                </Badge>
                            ))}
                        </div>
                        <p className="text-xs text-slate-500 mt-2">
                            Use these placeholders in subject and body. They will be replaced with actual values when sending.
                        </p>
                    </CardContent>
                </Card>

                {/* Subject Editor */}
                <Card>
                    <CardHeader>
                        <CardTitle>Subject Line</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <input
                            type="text"
                            value={editingTemplate.subject}
                            onChange={(e) =>
                                setEditingTemplate({
                                    ...editingTemplate,
                                    subject: e.target.value,
                                })
                            }
                            className="w-full px-3 py-2 border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                        />
                    </CardContent>
                </Card>

                {/* HTML Body Editor */}
                <Card>
                    <CardHeader>
                        <CardTitle>Email Body (HTML)</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <textarea
                            value={editingTemplate.body_html}
                            onChange={(e) =>
                                setEditingTemplate({
                                    ...editingTemplate,
                                    body_html: e.target.value,
                                })
                            }
                            rows={20}
                            className="w-full px-3 py-2 border rounded-lg bg-white font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                        />
                    </CardContent>
                </Card>

                {/* Preview */}
                <Card>
                    <CardHeader>
                        <CardTitle>Preview</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div
                            className="border rounded-lg p-4 bg-white"
                            dangerouslySetInnerHTML={{
                                __html: editingTemplate.body_html
                                    .replace(/\{\{siteName\}\}/g, "Your App")
                                    .replace(/\{\{userName\}\}/g, "John Doe")
                                    .replace(/\{\{siteUrl\}\}/g, "https://example.com")
                                    .replace(/\{\{teamName\}\}/g, "Acme Inc")
                                    .replace(/\{\{inviterName\}\}/g, "Jane Smith")
                                    .replace(/\{\{inviteUrl\}\}/g, "https://example.com/invite/xxx")
                                    .replace(/\{\{amount\}\}/g, "$29.99")
                                    .replace(/\{\{updatePaymentUrl\}\}/g, "https://example.com/billing")
                                    .replace(/\{\{year\}\}/g, new Date().getFullYear().toString()),
                            }}
                        />
                    </CardContent>
                </Card>
            </div>
        );
    }

    // List View
    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold">Email Templates</h1>
                <p className="text-slate-500">
                    Customize the transactional emails sent to your users
                </p>
            </div>

            {loading ? (
                <TemplateSkeleton />
            ) : templates.length === 0 ? (
                <Card>
                    <CardContent className="p-6 text-center text-slate-500">
                        No email templates found. Run database migration to add default templates.
                    </CardContent>
                </Card>
            ) : (
                <div className="space-y-4">
                    {templates.map((template) => (
                        <Card key={template.id} className="hover:shadow-md transition-shadow">
                            <CardContent className="p-6">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h3 className="font-semibold">{template.name}</h3>
                                        <p className="text-sm text-slate-500 mt-1">
                                            Subject: {template.subject}
                                        </p>
                                        <div className="flex gap-2 mt-2">
                                            {template.variables?.slice(0, 3).map((v) => (
                                                <Badge key={v} className="bg-slate-100 text-slate-600 text-xs">
                                                    {v}
                                                </Badge>
                                            ))}
                                            {template.variables?.length > 3 && (
                                                <Badge className="bg-slate-100 text-slate-600 text-xs">
                                                    +{template.variables.length - 3} more
                                                </Badge>
                                            )}
                                        </div>
                                    </div>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setEditingTemplate(template)}
                                    >
                                        Edit
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}
