/**
 * Social Image Templates for Satori — Premium Design
 *
 * Satori renders JSX-like objects to SVG. These templates produce
 * 1080×1350 Instagram-story-ratio dark-themed job cards.
 */

export interface JobImageData {
  company: string;
  role: string;
  city: string[];
  batchYears: string[];
  degree: string[];
  jobType: string;
  deadline: Date | null;
  logoUrl: string | null;
  salaryText: string | null;
  isUrgent: boolean;
  daysLeft: number | null;
}

// ── Color palette ──────────────────────────────────────────────
const BG        = "#0B0F1A";
const SURFACE   = "#131929";
const ACCENT_OR = "#E8873A";
const ACCENT_GR = "#22C55E";
const WHITE     = "#FFFFFF";
const WHITE_70  = "rgba(255,255,255,0.7)";
const WHITE_40  = "rgba(255,255,255,0.4)";
const WHITE_15  = "rgba(255,255,255,0.15)";
const WHITE_06  = "rgba(255,255,255,0.06)";
const BLUE_ACC  = "#3B82F6";
const PURPLE_ACC = "#8B5CF6";
const GREEN_ACC  = "#22C55E";

// ── Helpers ────────────────────────────────────────────────────

function getInitials(name: string): string {
  const words = name.replace(/[^a-zA-Z0-9\s]/g, "").trim().split(/\s+/).filter(Boolean);
  if (!words.length) return "?";
  return words.length === 1
    ? words[0].substring(0, 2).toUpperCase()
    : (words[0][0] + words[1][0]).toUpperCase();
}

const MONO_COLORS = [
  "#2563EB","#7C3AED","#DB2777","#DC2626","#EA580C","#CA8A04",
  "#16A34A","#0D9488","#0891B2","#4F46E5","#9333EA","#C026D3",
];

function hashColor(name: string): string {
  let h = 0;
  const s = name.toLowerCase();
  for (let i = 0; i < s.length; i++) { h = ((h << 5) - h) + s.charCodeAt(i); h |= 0; }
  return MONO_COLORS[Math.abs(h) % MONO_COLORS.length];
}

function truncate(text: string, max: number): string {
  return text.length <= max ? text : text.slice(0, max - 1) + "…";
}

// ── Default Template ───────────────────────────────────────────

export function DefaultJobTemplate(data: JobImageData) {
  const cityText  = data.city.length > 0 ? data.city.slice(0, 3).join(", ") : "Pan India";
  const batchText = data.batchYears.join(", ") + " Batch";
  const typeText  = data.jobType === "internship" ? "Internship" : "Fresher";
  const init      = getInitials(data.company);
  const monoColor = hashColor(data.company);
  const hasLogo   = data.logoUrl && !data.logoUrl.startsWith("data:");
  const role      = truncate(data.role, 50);

  return {
    type: "div",
    props: {
      style: {
        display: "flex",
        flexDirection: "column",
        width: "100%",
        height: "100%",
        backgroundColor: BG,
        fontFamily: "Inter",
        color: WHITE,
        position: "relative",
        overflow: "hidden",
      },
      children: [
        // ── Background grid pattern (subtle) ──
        gridOverlay(),

        // ── Inner padded content ──
        {
          type: "div",
          props: {
            style: {
              display: "flex",
              flexDirection: "column",
              width: "100%",
              height: "100%",
              padding: "56px 64px",
              position: "relative",
              zIndex: 1,
            },
            children: [
              // ── Top bar ──
              topBar(),

              // ── Spacer ──
              spacer(64),

              // ── Logo ──
              logoBlock(hasLogo, data.logoUrl, init, monoColor),

              // ── Spacer ──
              spacer(28),

              // ── Company name ──
              {
                type: "div",
                props: {
                  style: {
                    fontSize: "20px",
                    fontWeight: 500,
                    color: WHITE_40,
                    letterSpacing: "6px",
                    textTransform: "uppercase" as const,
                    textAlign: "center" as const,
                    display: "flex",
                    justifyContent: "center",
                  },
                  children: data.company.toUpperCase(),
                },
              },

              // ── Spacer ──
              spacer(20),

              // ── Role title (hero) ──
              {
                type: "div",
                props: {
                  style: {
                    fontSize: role.length > 30 ? "42px" : "50px",
                    fontWeight: 800,
                    lineHeight: 1.15,
                    letterSpacing: "-1px",
                    color: WHITE,
                    textAlign: "center" as const,
                    display: "flex",
                    justifyContent: "center",
                    maxWidth: "900px",
                    alignSelf: "center",
                  },
                  children: role,
                },
              },

              // ── Spacer ──
              spacer(40),

              // ── Divider ──
              {
                type: "div",
                props: {
                  style: {
                    width: "100%",
                    height: "1px",
                    background: `linear-gradient(90deg, transparent 0%, ${WHITE_15} 30%, ${WHITE_15} 70%, transparent 100%)`,
                  },
                },
              },

              // ── Spacer ──
              spacer(40),

              // ── Info rows ──
              {
                type: "div",
                props: {
                  style: {
                    display: "flex",
                    flexDirection: "column",
                    gap: "20px",
                    paddingLeft: "80px",
                  },
                  children: [
                    infoRow(BLUE_ACC,   "📍", cityText),
                    infoRow(PURPLE_ACC, "🎓", `${batchText}  ·  ${typeText}`),
                    ...(data.salaryText
                      ? [infoRow(GREEN_ACC, "💰", data.salaryText)]
                      : []),
                    ...(data.deadline && data.daysLeft !== null && data.daysLeft >= 0
                      ? [infoRow("#F59E0B", "⏰", `Closes in ${data.daysLeft} day${data.daysLeft !== 1 ? "s" : ""}`)]
                      : []),
                  ],
                },
              },

              // ── Flex spacer ──
              { type: "div", props: { style: { flex: 1 } } },

              // ── CTA button ──
              {
                type: "div",
                props: {
                  style: {
                    display: "flex",
                    justifyContent: "center",
                    width: "100%",
                  },
                  children: {
                    type: "div",
                    props: {
                      style: {
                        width: "100%",
                        height: "72px",
                        borderRadius: "18px",
                        background: `linear-gradient(135deg, ${ACCENT_OR} 0%, #D35F28 100%)`,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "26px",
                        fontWeight: 700,
                        color: WHITE,
                        letterSpacing: "0.5px",
                      },
                      children: "Apply Now  →",
                    },
                  },
                },
              },

              // ── Spacer ──
              spacer(20),

              // ── Footer ──
              {
                type: "div",
                props: {
                  style: {
                    display: "flex",
                    justifyContent: "center",
                    fontSize: "16px",
                    color: WHITE_40,
                    letterSpacing: "1px",
                  },
                  children: "fresherportal.com",
                },
              },
            ],
          },
        },
      ],
    },
  };
}

// ── Shared Components ──────────────────────────────────────────

function topBar() {
  return {
    type: "div",
    props: {
      style: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        width: "100%",
      },
      children: [
        // Brand
        {
          type: "div",
          props: {
            style: { display: "flex", alignItems: "center", gap: "10px" },
            children: [
              {
                type: "div",
                props: {
                  style: {
                    width: "28px",
                    height: "28px",
                    borderRadius: "6px",
                    backgroundColor: ACCENT_OR,
                  },
                },
              },
              {
                type: "span",
                props: {
                  style: {
                    fontSize: "22px",
                    fontWeight: 700,
                    letterSpacing: "-0.3px",
                    color: WHITE,
                  },
                  children: "FRESHERPORTAL",
                },
              },
            ],
          },
        },
        // Verified badge
        {
          type: "div",
          props: {
            style: {
              display: "flex",
              alignItems: "center",
              gap: "6px",
              backgroundColor: "rgba(34, 197, 94, 0.12)",
              border: "1px solid rgba(34, 197, 94, 0.25)",
              borderRadius: "20px",
              padding: "7px 16px",
              fontSize: "14px",
              fontWeight: 600,
              color: ACCENT_GR,
            },
            children: "✓ Verified",
          },
        },
      ],
    },
  };
}

function logoBlock(hasLogo: boolean, logoUrl: string | null, init: string, monoColor: string) {
  const size = 120;
  const inner = hasLogo
    ? {
        type: "img",
        props: {
          src: logoUrl!,
          width: size - 20,
          height: size - 20,
          style: { objectFit: "contain" as const },
        },
      }
    : {
        type: "div",
        props: {
          style: {
            fontSize: "48px",
            fontWeight: 800,
            color: WHITE,
          },
          children: init,
        },
      };

  return {
    type: "div",
    props: {
      style: {
        display: "flex",
        justifyContent: "center",
        width: "100%",
      },
      children: {
        type: "div",
        props: {
          style: {
            width: `${size}px`,
            height: `${size}px`,
            borderRadius: "28px",
            backgroundColor: hasLogo ? WHITE : monoColor,
            border: `2px solid ${WHITE_15}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: `0 0 40px ${WHITE_06}`,
          },
          children: inner,
        },
      },
    },
  };
}

function infoRow(accentColor: string, emoji: string, text: string) {
  return {
    type: "div",
    props: {
      style: {
        display: "flex",
        alignItems: "center",
        gap: "16px",
      },
      children: [
        // Accent bar
        {
          type: "div",
          props: {
            style: {
              width: "4px",
              height: "28px",
              borderRadius: "2px",
              backgroundColor: accentColor,
            },
          },
        },
        // Text
        {
          type: "span",
          props: {
            style: {
              fontSize: "24px",
              fontWeight: 500,
              color: WHITE_70,
            },
            children: `${emoji}  ${text}`,
          },
        },
      ],
    },
  };
}

function spacer(height: number) {
  return {
    type: "div",
    props: { style: { height: `${height}px` } },
  };
}

function gridOverlay() {
  // Subtle grid lines via SVG pattern
  return {
    type: "div",
    props: {
      style: {
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        opacity: 0.04,
        backgroundImage: `linear-gradient(${WHITE_15} 1px, transparent 1px), linear-gradient(to right, ${WHITE_15} 1px, transparent 1px)`,
        backgroundSize: "60px 60px",
      },
    },
  };
}

// ── Featured Template ──────────────────────────────────────────

export function FeaturedJobTemplate(data: JobImageData) {
  const base = DefaultJobTemplate(data);
  // Swap BG for a purple-tinted gradient effect
  base.props.style = {
    ...base.props.style,
    background: `linear-gradient(165deg, #0B0F1A 0%, #1A1040 50%, #0D1025 100%)`,
    backgroundColor: undefined,
  };
  return base;
}
