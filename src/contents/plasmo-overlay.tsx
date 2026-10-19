import React, { useEffect, useRef, useState } from 'react'
import type { PlasmoCSConfig, PlasmoCSUIProps, PlasmoRender } from "plasmo"
// import 'tippy.js/dist/tippy.css';
import cssText from "data-text:@src/contents/plasmo-overlay.css"
import { Toaster } from 'react-hot-toast';
import { iframeMessageSystem } from '@src/app/utils/IFrameMessageSystem';
import Browser from 'webextension-polyfill';
import {
    getActiveServer,
    independentUrlFor,
    SERVERS_KEY,
    ACTIVE_SERVER_KEY,
} from '@src/config/servers';
import { useTweetsStore } from '@src/components/extension/use-tweet-collection';
import { createRoot } from 'react-dom/client';
export const config: PlasmoCSConfig = {
    matches: ["https://x.com/*"],
}


export const getStyle = () => {
    const style = document.createElement("style")
    style.textContent = cssText
    return style
}

export const getShadowHostId = () => "tweet-cards-overlay"



const AnchorOverlay: React.FC<PlasmoCSUIProps> = ({ anchor }) => {
    const iframeRef = useRef<HTMLIFrameElement>(null)

    // 渲染地址来自用户选的服务器，所以要先读一次 storage 再挂 iframe。
    // 空字符串时先不渲染，避免用默认地址加载完再换一次造成重复请求。
    const [websiteURL, setWebsiteURL] = useState('');

    useEffect(() => {
        let alive = true;

        const sync = async () => {
            const server = await getActiveServer();
            if (alive) setWebsiteURL(independentUrlFor(server));
        };
        sync();

        // 在 popup 里改完地址，已经打开的 x.com 标签页要立刻跟上
        const onChanged = (changes: Record<string, unknown>, area: string) => {
            if (area !== 'local') return;
            if (changes[SERVERS_KEY] || changes[ACTIVE_SERVER_KEY]) sync();
        };
        Browser.storage.onChanged.addListener(onChanged);

        return () => {
            alive = false;
            Browser.storage.onChanged.removeListener(onChanged);
        };
    }, []);

    useEffect(() => {
        const unsubscribe = iframeMessageSystem.subscribe('generate-card-local', (value: any) => {
        });

        return () => unsubscribe();
    }, []);


    // 这里原本会向后台查一次 Gumroad license，未激活就把功能锁上。
    // 付费已经整体去掉，后台的 code 消息端点也一并删了，所以这一步不再需要。


    return (
        <div>
            {/* <PreviewToast tweetInfo={{}} tweetInfos={[]} /> */}
            {websiteURL && (
            <iframe
                ref={iframeRef}
                id="tweet-card-ai"
                src={websiteURL}
                key={websiteURL}
                style={{
                    width: '100vw',
                    height: '0px',
                    border: 'none',
                    opacity: 0,
                }}
            />
            )}
        </div >
    )
}


export const render: PlasmoRender<Element> = async ({
    anchor,
    createRootContainer
}) => {
    if (!anchor || !createRootContainer) return

    const rootContainer = await createRootContainer(anchor)

    const variantStyle = document.createElement("style")
    variantStyle.textContent = `
    :host {
    --background: 0 0% 100%;
    --foreground: 222.2 84% 4.9%;
    --card: 0 0% 100%;
    --card-foreground: 222.2 84% 4.9%;
    --popover: 0 0% 100%;
    --popover-foreground: 222.2 84% 4.9%;
    --primary: 221.2 83.2% 53.3%;
    --primary-foreground: 210 40% 98%;
    --secondary: 210 40% 96.1%;
    --secondary-foreground: 222.2 47.4% 11.2%;
    --muted: 210 40% 96.1%;
    --muted-foreground: 215.4 16.3% 46.9%;
    --accent: 210 40% 96.1%;
    --accent-foreground: 222.2 47.4% 11.2%;
    --destructive: 0 84.2% 60.2%;
    --destructive-foreground: 210 40% 98%;
    --border: 214.3 31.8% 91.4%;
    --input: 214.3 31.8% 91.4%;
    --ring: 221.2 83.2% 53.3%;
    --radius: 0.5rem;
    --chart-1: 12 76% 61%;
    --chart-2: 173 58% 39%;
    --chart-3: 197 37% 24%;
    --chart-4: 43 74% 66%;
    --chart-5: 27 87% 67%;
  }
 
  .dark {
    --background: 222.2 84% 4.9%;
    --foreground: 210 40% 98%;
    --card: 222.2 84% 4.9%;
    --card-foreground: 210 40% 98%;
    --popover: 222.2 84% 4.9%;
    --popover-foreground: 210 40% 98%;
    --primary: 217.2 91.2% 59.8%;
    --primary-foreground: 222.2 47.4% 11.2%;
    --secondary: 217.2 32.6% 17.5%;
    --secondary-foreground: 210 40% 98%;
    --muted: 217.2 32.6% 17.5%;
    --muted-foreground: 215 20.2% 65.1%;
    --accent: 217.2 32.6% 17.5%;
    --accent-foreground: 210 40% 98%;
    --destructive: 0 62.8% 30.6%;
    --destructive-foreground: 210 40% 98%;
    --border: 217.2 32.6% 17.5%;
    --input: 217.2 32.6% 17.5%;
    --ring: 224.3 76.3% 48%;
    --chart-1: 220 70% 50%;
    --chart-2: 160 60% 45%;
    --chart-3: 30 80% 55%;
    --chart-4: 280 65% 60%;
    --chart-5: 340 75% 55%;
}
    `

    const style = document.createElement("style")

    const wrapper = document.createElement('tweet-cards-ui')


    // Attach the wrapper to the document body
    document.body.appendChild(wrapper)

    // Create a shadow root
    const shadowRoot = wrapper.attachShadow({ mode: 'open' })

    style.textContent = cssText;
    shadowRoot.appendChild(style)
    shadowRoot.appendChild(variantStyle)

    // Append the rootContainer to the shadow root
    shadowRoot.appendChild(rootContainer)

    const root = createRoot(rootContainer)
    root.render(
        <div>
            <Toaster
                toastOptions={{
                    className: '',
                    style: {
                        display: "flex",
                        alignItems: "center",
                        background: "#333",
                        color: "#fff",
                        lineHeight: 1.3,
                        willChange: "transform",
                        boxShadow: "0 3px 10px rgba(0, 0, 0, 0.1), 0 3px 3px rgba(0, 0, 0, 0.05)",
                        maxWidth: "350px",
                        pointerEvents: "auto",
                        padding: "8px 10px",
                        borderRadius: "10px"
                    },
                }}
            />
            <AnchorOverlay></AnchorOverlay>
        </div>
    )
}