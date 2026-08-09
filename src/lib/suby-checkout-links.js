// Static hosted checkout links managed in the Suby dashboard.
// These links are safe to ship in the client because they contain no secret.
export const SUBY_CHECKOUT_LINKS = {
  starter: "https://app.suby.fi/p/pro_xfhkzuv3ad0cfsuh3om250p3",
  starter_3m: "https://app.suby.fi/p/pro_ue01q18pg2jrqwcf6y30w4kq",
  pro_max: "https://app.suby.fi/p/pro_cbqaw8409drbd1o702c1amih",
  pro_max_3m: "https://app.suby.fi/p/pro_m0ocolwx3hcxch2pa66n5ygm",
};

export function getSubyCheckoutLink(plan = "starter") {
  return SUBY_CHECKOUT_LINKS[plan] || SUBY_CHECKOUT_LINKS.starter;
}
