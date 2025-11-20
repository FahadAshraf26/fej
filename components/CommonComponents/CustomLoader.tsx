import { forwardRef } from "react";
import {
  LoaderProps,
  MantineColor,
  MantineNumberSize,
  useMantineTheme,
  Box,
} from "@mantine/core";
import type { SVGAttributes } from "react";

type LoaderSize = {
  xs: number;
  sm: number;
  md: number;
  lg: number;
  xl: number;
};

interface LoaderCustomProps {
  size?: MantineNumberSize;
  color?: MantineColor;
}

type CustomLoaderProps = LoaderCustomProps &
  Omit<LoaderProps, keyof SVGAttributes<SVGElement> | keyof LoaderCustomProps> &
  Omit<SVGAttributes<SVGElement>, keyof LoaderProps | keyof LoaderCustomProps>;

export const CustomLoader = forwardRef<SVGSVGElement, CustomLoaderProps>(
  ({ size = "md", color, sx, ...others }, ref) => {
    const theme = useMantineTheme();

    const sizes: LoaderSize = {
      xs: 18,
      sm: 22,
      md: 36,
      lg: 44,
      xl: 58,
    };

    const getSize = (size: MantineNumberSize) => {
      if (typeof size === "number") {
        return size;
      }

      return size in sizes ? sizes[size as keyof LoaderSize] : sizes.md;
    };

    const spinnerSize = getSize(size);
    const customColor = color
      ? theme.colors[color as MantineColor]?.[6] ||
        theme.colors[theme.primaryColor][6]
      : theme.colors[theme.primaryColor][6];

    return (
      <Box sx={sx}>
        <div className="logo-wrapper">
          <div className="logo-container">
            <svg
              width="30%"
              height="30%"
              viewBox="0 0 31 29"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M15.3546 28.2073C29.7323 27.928 30.6629 22.203 30.6629 20.8998C30.6629 19.5966 23.823 18.4795 15.3546 18.4795C6.88625 18.4795 0.0463867 19.55 0.0463867 20.8998C0.0463867 22.2496 0.976981 28.4865 15.3546 28.2073Z"
                fill="#FECB80"
                className="svg-elem-1"
              ></path>
              <path
                d="M15.3548 25.7871C23.835 25.7871 30.7096 23.4323 30.7096 20.5276C30.7096 17.6228 23.835 15.2681 15.3548 15.2681C6.87457 15.2681 0 17.6228 0 20.5276C0 23.4323 6.87457 25.7871 15.3548 25.7871Z"
                fill="#EE6D01"
                className="svg-elem-2"
              ></path>
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M15.3546 23.3667C29.7323 23.0874 30.6629 17.3625 30.6629 16.0592C30.6629 14.756 23.823 13.6389 15.3546 13.6389C6.88625 13.6389 0.0463867 14.7094 0.0463867 16.0592C0.0463867 17.3625 0.976981 23.5994 15.3546 23.3667Z"
                fill="#FECB80"
                className="svg-elem-3"
              ></path>
              <path
                d="M15.3548 20.9465C23.835 20.9465 30.7096 18.5918 30.7096 15.687C30.7096 12.7823 23.835 10.4275 15.3548 10.4275C6.87457 10.4275 0 12.7823 0 15.687C0 18.5918 6.87457 20.9465 15.3548 20.9465Z"
                fill="#EE6D01"
                className="svg-elem-4"
              ></path>
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M15.3546 18.4795C29.7323 18.2002 30.6629 12.4753 30.6629 11.172C30.6629 9.86877 23.823 8.75171 15.3546 8.75171C6.88625 8.75171 0.0463867 9.86877 0.0463867 11.172C0.0463867 12.4753 0.976981 18.7588 15.3546 18.4795Z"
                fill="#FECB80"
                className="svg-elem-5"
              ></path>
              <path
                d="M15.3548 16.1523C23.835 16.1523 30.7096 13.7976 30.7096 10.8928C30.7096 7.98807 23.835 5.6333 15.3548 5.6333C6.87457 5.6333 0 7.98807 0 10.8928C0 13.7976 6.87457 16.1523 15.3548 16.1523Z"
                fill="#EE6D01"
                className="svg-elem-6"
              ></path>
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M15.3546 13.6389C29.7323 13.3597 30.6629 7.63469 30.6629 6.33144C30.6629 5.0282 23.823 3.91113 15.3546 3.91113C6.88625 3.91113 0.0463867 4.98165 0.0463867 6.33144C0.0463867 7.68123 0.976981 13.9182 15.3546 13.6389Z"
                fill="#FECB80"
                className="svg-elem-7"
              ></path>
              <path
                d="M15.3548 11.3118C23.835 11.3118 30.7096 8.957 30.7096 6.05224C30.7096 3.14749 23.835 0.792725 15.3548 0.792725C6.87457 0.792725 0 3.14749 0 6.05224C0 8.957 6.87457 11.3118 15.3548 11.3118Z"
                fill="#EE6D01"
                className="svg-elem-8"
              ></path>
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M15.3547 3.25952C20.2403 3.25952 24.335 4.2835 24.9398 5.63329C24.9864 5.72638 25.0329 5.86601 25.0329 6.00564C25.0329 7.30889 22.9391 7.72779 21.7758 8.23978C21.4036 8.42595 21.1244 8.8914 21.0313 9.35684V21.3188C21.0313 22.4358 20.1473 23.3667 19.0306 23.3667H18.984C17.8673 23.3667 16.9367 22.4358 16.9367 21.3188V10.2877C16.7041 8.70522 14.3776 8.0536 13.7262 10.2877V13.8251C13.7262 14.9422 12.8421 15.8731 11.7254 15.8731H11.6789C10.5622 15.8731 9.63158 14.9887 9.63158 13.8717V13.8251V9.40339C9.63158 8.93794 9.39893 8.56559 8.8871 8.19323C7.90998 7.82088 5.63003 7.26234 5.5835 6.00564V5.9591V5.91255C5.72309 4.46968 10.0503 3.25952 15.3547 3.25952Z"
                fill="#BF360B"
                className="syrup-pour"
              ></path>
            </svg>
            <div className="text-container">Flapjack</div>
          </div>
        </div>
        <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@600&display=swap');

      .logo-wrapper {
        display: flex;
        align-items: center;
        gap: 20px;
        justify-content: center;
        align-items: center;
        height: 80vh;
        
      }

      .logo-container {
        // width: 30%;
        height: 30%;
        display: flex
;
    align-items: center;
    gap: 20px;
      }

      .text-container {
        font-family: 'Poppins', sans-serif;
        font-size: 24px;
        font-weight: 600;
        color: #2e2e2e;
        position: relative;
        opacity: 0;
        animation: swooshIn 1s ease-out 1s forwards;
      }

      @keyframes swooshIn {
        0% {
          opacity: 0;
          transform: translateX(-50px) skewX(-10deg);
        }
        100% {
          opacity: 1;
          transform: translateX(0) skewX(0);
        }
      }

      /* Original pancake fill animations */
      @keyframes animate-svg-fill-1 {
        0% {
          fill: transparent;
        }
        100% {
          fill: rgb(254, 203, 128);
        }
      }

      .svg-elem-1 {
        animation: animate-svg-fill-1 0.3s cubic-bezier(0.55, 0.085, 0.68, 0.53) 0.8s both;
      }

      @keyframes animate-svg-fill-2 {
        0% {
          fill: transparent;
        }
        100% {
          fill: rgb(238, 109, 1);
        }
      }

      .svg-elem-2 {
        animation: animate-svg-fill-2 0.3s cubic-bezier(0.55, 0.085, 0.68, 0.53) 0.9s both;
      }

      @keyframes animate-svg-fill-3 {
        0% {
          fill: transparent;
        }
        100% {
          fill: rgb(254, 203, 128);
        }
      }

      .svg-elem-3 {
        animation: animate-svg-fill-3 0.3s cubic-bezier(0.55, 0.085, 0.68, 0.53) 1s both;
      }

      @keyframes animate-svg-fill-4 {
        0% {
          fill: transparent;
        }
        100% {
          fill: rgb(238, 109, 1);
        }
      }

      .svg-elem-4 {
        animation: animate-svg-fill-4 0.3s cubic-bezier(0.55, 0.085, 0.68, 0.53) 1.1s both;
      }

      @keyframes animate-svg-fill-5 {
        0% {
          fill: transparent;
        }
        100% {
          fill: rgb(254, 203, 128);
        }
      }

      .svg-elem-5 {
        animation: animate-svg-fill-5 0.3s cubic-bezier(0.55, 0.085, 0.68, 0.53) 1.2s both;
      }

      @keyframes animate-svg-fill-6 {
        0% {
          fill: transparent;
        }
        100% {
          fill: rgb(238, 109, 1);
        }
      }

      .svg-elem-6 {
        animation: animate-svg-fill-6 0.3s cubic-bezier(0.55, 0.085, 0.68, 0.53) 1.3s both;
      }

      @keyframes animate-svg-fill-7 {
        0% {
          fill: transparent;
        }
        100% {
          fill: rgb(254, 203, 128);
        }
      }

      .svg-elem-7 {
        animation: animate-svg-fill-7 0.3s cubic-bezier(0.55, 0.085, 0.68, 0.53) 1.4s both;
      }

      @keyframes animate-svg-fill-8 {
        0% {
          fill: transparent;
        }
        100% {
          fill: rgb(238, 109, 1);
        }
      }

      .svg-elem-8 {
        animation: animate-svg-fill-8 0.3s cubic-bezier(0.55, 0.085, 0.68, 0.53) 1.5s both;
      }

      @keyframes syrup-pour {
        0% {
          clip-path: polygon(0 0, 100% 0, 100% 0, 0 0);
        }
        100% {
          clip-path: polygon(0 0, 100% 0, 100% 100%, 0 100%);
        }
      }

      .syrup-pour {
        clip-path: polygon(0 0, 100% 0, 100% 0, 0 0);
        animation: syrup-pour 1.5s linear 1.5s forwards;
      }`}</style>
      </Box>
    );
  }
);

CustomLoader.displayName = "CustomLoader";
