import { useEffect } from "react";

const SCRIPT_ID = "blootrue-platform-js";
const SCRIPT_SRC = "https://api.blootrue.com/api/widgets/platform.js";
const WIDGET_CLASS = "blootrue-widget-4KMJ5Vs1p_2V";

function getTrustedScriptURL(url: string): string | unknown {
  if (typeof window === "undefined") return url;
  const maybeTrustedTypes = (window as any).trustedTypes;
  if (!maybeTrustedTypes) return url;

  let policy =
    typeof maybeTrustedTypes.getPolicy === "function"
      ? maybeTrustedTypes.getPolicy("blootrue-loader")
      : null;

  if (!policy && typeof maybeTrustedTypes.createPolicy === "function") {
    try {
      policy = maybeTrustedTypes.createPolicy("blootrue-loader", {
        createScriptURL: (input: string) => input,
      });
    } catch {
      // createPolicy throws if the CSP's trusted-types allow-list does not name
      // this policy. Returning the plain url lets the browser reject the script
      // on its own terms instead of this throw escaping the effect and taking
      // the rest of the mount down with it.
      return url;
    }
  }

  if (policy && typeof policy.createScriptURL === "function") {
    return policy.createScriptURL(url);
  }

  return url;
}

function ensureBlootrueScript(): void {
  if (typeof document === "undefined") return;
  if (document.getElementById(SCRIPT_ID)) return;

  const script = document.createElement("script");
  script.id = SCRIPT_ID;
  const trustedUrl = getTrustedScriptURL(SCRIPT_SRC);
  (script as any).src = trustedUrl;
  script.async = true;
  script.defer = true;
  document.body.appendChild(script);
}

export function BlootrueWidget() {
  useEffect(() => {
    ensureBlootrueScript();
  }, []);

  return <div className={WIDGET_CLASS} />;
}

export const TrustindexWidget = BlootrueWidget;
