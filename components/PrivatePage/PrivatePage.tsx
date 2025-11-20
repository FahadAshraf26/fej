import {
  Container,
  Title,
  Text,
  Button,
  createStyles,
  MantineTheme,
} from "@mantine/core";
import { IconDog } from "@tabler/icons";
import { useRouter } from "next/router";
import Head from "next/head";
import { useEffect, useRef, useState } from "react";

// TypeScript interfaces
interface PrivatePageProps {
  login?: boolean;
  title?: string;
  text?: string;
  subtitle?: string;
}

interface ContentType {
  title: string;
  message: string;
  subtitle: string;
}

// Styles with proper typing
const useStyles = createStyles((theme: MantineTheme) => ({
  root: {
    paddingTop: 80,
    paddingBottom: 80,
    minHeight: "calc(100vh - 65px)",
    display: "flex",
    alignItems: "center",
  },

  content: {
    maxWidth: 540,
    margin: "auto",
    textAlign: "center",
    position: "relative",
  },

  icon: {
    color: "#bf360a",
    width: 160,
    height: 160,
    marginBottom: theme.spacing.lg,
    transition: "transform 0.2s ease, color 0.3s ease",
  },

  dogContainer: {
    display: "inline-block",
    position: "relative",
    width: 160,
    height: 160,
    margin: "0 auto",
    marginBottom: theme.spacing.lg,
  },

  title: {
    fontFamily: `Greycliff CF, ${theme.fontFamily}`,
    textAlign: "center",
    fontWeight: 900,
    fontSize: 38,
    marginBottom: theme.spacing.md,

    [theme.fn.smallerThan("sm")]: {
      fontSize: 32,
    },
  },

  description: {
    fontSize: 24,
    marginBottom: theme.spacing.xl,
  },

  subtitle: {
    color: theme.colors.gray[6],
    fontSize: 18,
    marginBottom: theme.spacing.xl * 1.5,
  },

  buttonContainer: {
    position: "relative",
    display: "inline-block",
  },

  loginButton: {
    fontSize: 21,
    padding: "6px 12px",
    fontWeight: 500,
    color: theme.colors.orange[4],
    backgroundColor: "transparent",
    border: "none",
    cursor: "pointer",
    transition: "all 0.3s ease",
    position: "relative",
    zIndex: 1,
    marginTop: "0px !important",
    marginBottom: "10px",

    "&:hover": {
      backgroundColor: theme.colors.orange[4],
      color: "white",
      transform: "translateY(-2px)",
      boxShadow: theme.shadows.sm,
      borderRadius: theme.radius.sm,
    },

    "&:focus": {
      outline: "none",
    },
  },

  underlineSvg: {
    position: "absolute",
    top: "80%",
    left: 0,
    width: "100%",
    height: "12px",
    pointerEvents: "none",
    transition: "opacity 0.3s ease",
  },

  path: {
    fill: "none",
    stroke: theme.colors.orange[4],
    strokeWidth: 4.5,
  },
}));

const PrivatePage: React.FC<PrivatePageProps> = ({
  login = false,
  title = "",
  text = "",
  subtitle = "",
}) => {
  const { classes } = useStyles();
  const router = useRouter();
  const [svgVisible, setSvgVisible] = useState(true);
  const dogRef = useRef<HTMLDivElement>(null);
  const loginButtonRef = useRef<HTMLButtonElement>(null);

  // Content based on mode
  const loginContent: ContentType = {
    title: title || "Woof! Authentication Required",
    message: "Our guard dog needs to verify you're part of the pack!",
    subtitle:
      subtitle ||
      "Don't worry, he's friendly - just click login to join the fun.",
  };

  const restrictedContent: ContentType = {
    title: title || "Puppy Protection Protocol",
    message: text || "Our furry security officer says this area is off-limits.",
    subtitle:
      subtitle || "Even the best treats won't convince this loyal guardian!",
  };

  // Handle login button click
  const handleClick = (): void => {
    router.push("/templates");
  };

  // Determine which content to display
  const content = login ? loginContent : restrictedContent;

  // Animation controller function
  const animateSvgPaths = () => {
    const svgElem = document.querySelector(`.${classes.underlineSvg}`);
    if (!svgElem) return;

    // Create fresh SVG paths
    svgElem.innerHTML = "";

    // Create first path
    const path1 = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "path"
    );
    path1.setAttribute("class", classes.path);
    path1.setAttribute(
      "d",
      "M17.89597941469401 10.892639194615185 C50.155772620781505 8.96450303900747, 83.93449721572398 6.6545224975398, 142.3191113276407 5.34633404482156"
    );
    path1.style.strokeDasharray = "126";
    path1.style.strokeDashoffset = "126";
    svgElem.appendChild(path1);

    // Create second path
    const path2 = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "path"
    );
    path2.setAttribute("class", classes.path);
    path2.setAttribute(
      "d",
      "M141.77168488968164 10.52474732231349 C103.1847435343472 7.0262903359357, 60.15188409582187 8.7554302897874, 17.846850191242993 9.37589399050921"
    );
    path2.style.strokeDasharray = "126";
    path2.style.strokeDashoffset = "126";
    svgElem.appendChild(path2);

    // Animate first path
    setTimeout(() => {
      path1.style.transition = "stroke-dashoffset 0.3s ease-out";
      path1.style.strokeDashoffset = "0";
    }, 50);

    // Animate second path with delay
    setTimeout(() => {
      path2.style.transition = "stroke-dashoffset 0.3s ease-out";
      path2.style.strokeDashoffset = "0";
    }, 350);
  };

  // First render animation
  useEffect(() => {
    if (login) {
      animateSvgPaths();
    }
  }, [login]);

  // Dog following mouse movement
  useEffect(() => {
    let isMouseOnPage = false;
    let isMouseOverButton = false;

    const handleMouseMove = (e: MouseEvent) => {
      if (!dogRef.current) return;
      isMouseOnPage = true;

      // Skip color calculation if mouse is over the button
      if (isMouseOverButton) return;

      // Get dog element position
      const dogRect = dogRef.current.getBoundingClientRect();
      const dogCenterX = dogRect.left + dogRect.width / 2;
      const dogCenterY = dogRect.top + dogRect.height / 2;

      // Calculate angle between mouse and dog
      const deltaX = e.clientX - dogCenterX;
      const deltaY = e.clientY - dogCenterY;

      // Calculate rotation angle to look at mouse (in degrees)
      let angle = Math.atan2(deltaY, deltaX) * (180 / Math.PI);

      // For this particular dog icon, adjust to make it face correctly
      angle += 270; // Corrected angle adjustment

      // Apply the rotation - allow full 360-degree rotation
      dogRef.current.style.transform = `rotate(${angle}deg)`;

      // Calculate distance from login button to mouse if login is true
      // Otherwise, keep the original red color
      if (login && loginButtonRef.current) {
        const buttonRect = loginButtonRef.current.getBoundingClientRect();
        const buttonCenterX = buttonRect.left + buttonRect.width / 2;
        const buttonCenterY = buttonRect.top + buttonRect.height / 2;

        // Calculate distance from button to mouse
        const buttonDeltaX = e.clientX - buttonCenterX;
        const buttonDeltaY = e.clientY - buttonCenterY;
        const distance = Math.sqrt(
          buttonDeltaX * buttonDeltaX + buttonDeltaY * buttonDeltaY
        );

        // Get the page dimensions to normalize the distance
        const pageWidth = document.documentElement.clientWidth;
        const pageHeight = document.documentElement.clientHeight;

        // Use a smaller divisor to make the color change more rapidly with distance
        const maxDistance = Math.min(pageWidth, pageHeight) / 1.5;

        // Normalize distance (0 to 1), and ensure we can reach 1 (red) more easily
        const normalizedDistance = Math.min(1, distance / maxDistance);

        // Change color based on distance
        const dogIcon = dogRef.current.querySelector("svg") as SVGElement;
        if (dogIcon) {
          // Start with green when close, go through orange to red when far
          // Using HSL to smoothly transition between colors
          const hue = Math.max(0, 120 - normalizedDistance * 120); // 120 (green) to 0 (red)
          const saturation = 70 + normalizedDistance * 30; // 70% to 100%
          const lightness = 45 - normalizedDistance * 5; // 45% to 40%

          dogIcon.style.color = `hsl(${hue}, ${saturation}%, ${lightness}%)`;
        }
      } else {
        // If no login button, keep the original red color
        const dogIcon = dogRef.current.querySelector("svg") as SVGElement;
        if (dogIcon) {
          dogIcon.style.color = "#bf360a"; // Original color
        }
      }
    };

    const handleMouseLeave = () => {
      isMouseOnPage = false;
      // Reset dog position when mouse leaves the page
      if (dogRef.current) {
        dogRef.current.style.transform = "rotate(0deg)";

        // Reset color to original red
        const dogIcon = dogRef.current.querySelector("svg") as SVGElement;
        if (dogIcon) {
          dogIcon.style.color = "#bf360a"; // Original color
        }
      }
    };

    // Set flag for button hover state to prevent mousemove from overriding color
    window.addEventListener("mouseover", (e) => {
      const loginButton = document.querySelector(`.${classes.loginButton}`);
      if (
        e.target === loginButton ||
        (loginButton && loginButton.contains(e.target as Node))
      ) {
        isMouseOverButton = true;
      }
    });

    window.addEventListener("mouseout", (e) => {
      const loginButton = document.querySelector(`.${classes.loginButton}`);
      if (
        e.target === loginButton ||
        (loginButton && loginButton.contains(e.target as Node))
      ) {
        isMouseOverButton = false;
      }
    });

    // Add event listeners
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseleave", handleMouseLeave);

    // Clean up
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseleave", handleMouseLeave);
      window.removeEventListener("mouseover", () => {});
      window.removeEventListener("mouseout", () => {});
    };
  }, [login]);

  return (
    <>
      <Head>
        <title>{content.title}</title>
        <meta name="description" content={content.message} />
      </Head>

      <Container className={classes.root}>
        <div className={classes.content}>
          <div className={classes.dogContainer} ref={dogRef}>
            <IconDog
              stroke={1.5}
              className={classes.icon}
              style={{ display: "block" }}
            />
          </div>

          <Title className={classes.title}>{content.title}</Title>

          {login ? (
            <>
              <Text className={classes.description}>{content.message}</Text>
              <div className={classes.buttonContainer}>
                <Button
                  ref={loginButtonRef}
                  variant="subtle"
                  className={classes.loginButton}
                  onClick={handleClick}
                  mt="md"
                  onMouseEnter={() => {
                    setSvgVisible(false);
                    // Force green color when hovering login button, regardless of distance
                    const dogIcon = dogRef.current?.querySelector(
                      "svg"
                    ) as SVGElement;
                    if (dogIcon) {
                      dogIcon.style.color = "#4CAF50"; // Bright green color
                    }
                  }}
                  onMouseLeave={() => {
                    setSvgVisible(true);
                    setTimeout(animateSvgPaths, 50);
                    // Let the mousemove handler handle the color again
                    // We don't set a specific color here since the mousemove event
                    // will update the color based on the new mouse position
                  }}
                >
                  Login Now
                </Button>
                <svg
                  className={classes.underlineSvg}
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 160 20"
                  width="160"
                  height="20"
                  style={{
                    opacity: svgVisible ? 1 : 0,
                    display: "block",
                    overflow: "visible",
                  }}
                >
                  {/* Paths will be added dynamically by JavaScript */}
                </svg>
              </div>
            </>
          ) : (
            <Text className={classes.description}>{content.message}</Text>
          )}

          <Text className={classes.subtitle}>{content.subtitle}</Text>
        </div>
      </Container>
    </>
  );
};

export default PrivatePage;
