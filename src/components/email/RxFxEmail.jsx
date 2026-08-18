import {
  Html,
  Head,
  Body,
  Preview,
  Container,
  Section,
  Heading,
  Text,
  Button,
  Hr,
} from "@react-email/components";

/*
 * Templates email en React (@react-email/components) — brand RxFx.
 *
 * - `EmailContent` : coquille intérieure (Container) SANS <html>/<body> —
 *   donc réutilisable en aperçu "live" dans le navigateur de l'admin.
 * - `WelcomeEmail`  : document email complet (avec <Html>/<Body>) destiné à
 *   être rendu côté serveur (react-email `render`) avant envoi via `sendEmail`.
 */

const colors = {
  bg: "#0a0a0a",
  surface: "#111519",
  border: "rgba(255,255,255,0.08)",
  text: "#e8e8e8",
  muted: "#8a949e",
  cyan: "#00d9ff",
};

const container = {
  margin: "0 auto",
  padding: "24px 0",
  width: "100%",
  maxWidth: "560px",
  fontFamily: "'Inter', 'Segoe UI', Arial, sans-serif",
};

const body = {
  backgroundColor: colors.bg,
  margin: 0,
  padding: 0,
};

const header = {
  padding: "20px 28px",
  borderBottom: `1px solid ${colors.border}`,
};

const brand = {
  margin: 0,
  fontSize: "18px",
  fontWeight: 800,
  letterSpacing: "-0.02em",
  color: "#ffffff",
};

const card = {
  padding: "28px",
  backgroundColor: colors.surface,
  border: `1px solid ${colors.border}`,
  borderRadius: "12px",
  marginTop: "16px",
};

const title = {
  margin: "0 0 12px",
  fontSize: "20px",
  fontWeight: 800,
  color: "#ffffff",
};

const paragraph = {
  margin: "0 0 16px",
  fontSize: "14px",
  lineHeight: "1.6",
  color: colors.text,
};

const button = {
  display: "inline-block",
  backgroundColor: colors.cyan,
  color: "#000000",
  fontSize: "13px",
  fontWeight: 800,
  textTransform: "uppercase",
  letterSpacing: "0.08em",
  padding: "12px 22px",
  borderRadius: "8px",
  textDecoration: "none",
};

const hr = {
  borderColor: colors.border,
  margin: "24px 0",
};

const footer = {
  padding: "0 28px",
  textAlign: "center",
};

const footerText = {
  margin: "0 0 4px",
  fontSize: "11px",
  lineHeight: "1.6",
  color: colors.muted,
};

export function EmailContent({ title, children, footerNote = "RxFx Logbook — Trading Intelligence" }) {
  return (
    <Container style={container}>
      <Section style={header}>
        <Text style={brand}>RxFx Logbook</Text>
      </Section>
      <Section style={card}>
        {title && <Heading as="h1" style={title}>{title}</Heading>}
        {children}
      </Section>
      <Hr style={hr} />
      <Section style={footer}>
        <Text style={footerText}>{footerNote}</Text>
        <Text style={footerText}>support@rxfx.io</Text>
      </Section>
    </Container>
  );
}

export function WelcomeEmail({ name = "trader", link = "https://app.rxfx.io/dashboard" }) {
  return (
    <Html>
      <Head />
      <Preview>{`Bienvenue dans RxFx Logbook, ${name} !`}</Preview>
      <Body style={body}>
        <EmailContent
          title={`Bienvenue, ${name} 👋`}
          footerNote="Journalisez, analysez, progressez."
        >
          <Text style={paragraph}>
            Votre journal de trading est prêt. Analysez vos performances, suivez votre edge et
            progressez trade après trade.
          </Text>
          <Button href={link} style={button}>Ouvrir mon dashboard</Button>
        </EmailContent>
      </Body>
    </Html>
  );
}
