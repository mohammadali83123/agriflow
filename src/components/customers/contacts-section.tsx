"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, User, Phone, Mail } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { addContact, removeContact } from "@/server/customers/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { customerContact } from "@/lib/db/schema";

type Contact = typeof customerContact.$inferSelect;

const contactFormSchema = z.object({
  customerId: z.string().min(1),
  name: z.string().min(1, "Name is required"),
  role: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
});

type ContactFormValues = z.infer<typeof contactFormSchema>;

interface ContactsSectionProps {
  customerId: string;
  contacts: Contact[];
  canWrite: boolean;
}

export function ContactsSection({
  customerId,
  contacts,
  canWrite,
}: ContactsSectionProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ContactFormValues>({
    resolver: zodResolver(contactFormSchema),
    defaultValues: { customerId },
  });

  async function onSubmit(data: ContactFormValues) {
    setServerError(null);
    try {
      await addContact(data);
      reset({ customerId });
      setOpen(false);
      router.refresh();
    } catch (err) {
      setServerError(err instanceof Error ? err.message : "Something went wrong");
    }
  }

  async function handleRemove(id: string) {
    try {
      await removeContact(id);
      router.refresh();
    } catch {
      // silent
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-medium">Contacts</h2>
        {canWrite && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger
              render={
                <Button variant="outline" size="sm">
                  <Plus className="size-3.5" />
                  Add contact
                </Button>
              }
            />
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add contact</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <input type="hidden" {...register("customerId")} />
                {serverError && (
                  <p className="text-sm text-destructive">{serverError}</p>
                )}
                <div className="space-y-1.5">
                  <Label htmlFor="contact-name">
                    Name <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="contact-name"
                    placeholder="Contact name"
                    aria-invalid={!!errors.name}
                    {...register("name")}
                  />
                  {errors.name && (
                    <p className="text-xs text-destructive">{errors.name.message}</p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="contact-role">Role</Label>
                  <Input
                    id="contact-role"
                    placeholder="e.g. Procurement Manager"
                    {...register("role")}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="contact-phone">Phone</Label>
                  <Input
                    id="contact-phone"
                    type="tel"
                    placeholder="+92 300 0000000"
                    {...register("phone")}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="contact-email">Email</Label>
                  <Input
                    id="contact-email"
                    type="email"
                    placeholder="name@company.com"
                    aria-invalid={!!errors.email}
                    {...register("email")}
                  />
                  {errors.email && (
                    <p className="text-xs text-destructive">{errors.email.message}</p>
                  )}
                </div>
                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setOpen(false)}
                    disabled={isSubmitting}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? "Saving…" : "Add contact"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {contacts.length === 0 ? (
        <div className="rounded-xl border py-8 text-center text-sm text-muted-foreground">
          No additional contacts yet.
        </div>
      ) : (
        <div className="rounded-xl border divide-y">
          {contacts.map((contact) => (
            <div
              key={contact.id}
              className="flex items-start justify-between gap-3 px-4 py-3"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <User className="size-3.5 text-muted-foreground" />
                  {contact.name}
                  {contact.role && (
                    <span className="text-xs text-muted-foreground font-normal">
                      · {contact.role}
                    </span>
                  )}
                </div>
                {contact.phone && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Phone className="size-3" />
                    {contact.phone}
                  </div>
                )}
                {contact.email && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Mail className="size-3" />
                    {contact.email}
                  </div>
                )}
              </div>
              {canWrite && (
                <button
                  onClick={() => handleRemove(contact.id)}
                  className="text-muted-foreground hover:text-destructive transition-colors p-1 rounded"
                  aria-label="Remove contact"
                >
                  <Trash2 className="size-3.5" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
