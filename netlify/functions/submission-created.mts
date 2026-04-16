import type { Context } from "@netlify/functions";

interface FormPayload {
  form_name: string;
  ordered_human_fields: Array<{ name: string; value: string }>;
  data: Record<string, string>;
  created_at: string;
}

export default async (req: Request, context: Context) => {
  const { payload } = (await req.json()) as { payload: FormPayload };

  if (payload.form_name !== "contact") {
    return new Response("Ignored", { status: 200 });
  }

  const { name, email, phone, service, message } = payload.data;
  const recipientEmail = "contact@hd-networking.co.uk";

  const emailBody = [
    `New quote enquiry received from the website:`,
    ``,
    `Name: ${name}`,
    `Email: ${email}`,
    `Phone: ${phone || "Not provided"}`,
    `Service Needed: ${service || "Not specified"}`,
    ``,
    `Message:`,
    `${message}`,
    ``,
    `---`,
    `Submitted at: ${payload.created_at}`,
  ].join("\n");

  const mailgunApiKey = Netlify.env.get("MAILGUN_API_KEY");
  const mailgunDomain = Netlify.env.get("MAILGUN_DOMAIN");

  if (mailgunApiKey && mailgunDomain) {
    const form = new URLSearchParams();
    form.append("from", `HD Networking Website <noreply@${mailgunDomain}>`);
    form.append("to", recipientEmail);
    form.append("subject", `New Quote Enquiry: ${service || "General"} - from ${name}`);
    form.append("text", emailBody);
    if (email) {
      form.append("h:Reply-To", email);
    }

    const response = await fetch(
      `https://api.mailgun.net/v3/${mailgunDomain}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${btoa(`api:${mailgunApiKey}`)}`,
        },
        body: form,
      }
    );

    if (!response.ok) {
      console.error("Mailgun error:", await response.text());
      return new Response("Email send failed", { status: 500 });
    }

    console.log(`Quote enquiry from ${name} (${email}) forwarded to ${recipientEmail}`);
    return new Response("OK");
  }

  // Fallback: log the submission details for Netlify's built-in notification system
  console.log(`Quote enquiry received - Netlify email notifications should deliver to ${recipientEmail}`);
  console.log("Submission details:", JSON.stringify({ name, email, phone, service, message }));
  return new Response("OK");
};
