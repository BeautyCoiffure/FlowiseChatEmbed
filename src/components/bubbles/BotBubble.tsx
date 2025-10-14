import { createEffect, Show, createSignal, onMount, For } from 'solid-js';
import { Avatar } from '../avatars/Avatar';
import { Marked } from '@ts-stack/markdown';
import { FeedbackRatingType, sendFeedbackQuery, sendFileDownloadQuery, updateFeedbackQuery } from '@/queries/sendMessageQuery';
import { FileUpload, IAction, MessageType } from '../Bot';
import { CopyToClipboardButton, ThumbsDownButton, ThumbsUpButton } from '../buttons/FeedbackButtons';
import FeedbackContentDialog from '../FeedbackContentDialog';
import { AgentReasoningBubble } from './AgentReasoningBubble';
import { TickIcon, XIcon } from '../icons';
import { SourceBubble } from '../bubbles/SourceBubble';
import { DateTimeToggleTheme } from '@/features/bubble/types';
// type Propimport { DateTimeToggleTheme } from '@/features/bubble/types';
import { WorkflowTreeView } from '../treeview/WorkflowTreeView';

type Props = {
  message: MessageType;
  chatflowid: string;
  chatId: string;
  apiHost?: string;
  onRequest?: (request: RequestInit) => Promise<void>;
  fileAnnotations?: any;
  showAvatar?: boolean;
  avatarSrc?: string;
  backgroundColor?: string;
  textColor?: string;
  chatFeedbackStatus?: boolean;
  fontSize?: number;
  feedbackColor?: string;
  isLoading: boolean;
  dateTimeToggle?: DateTimeToggleTheme;
  showAgentMessages?: boolean;
  sourceDocsTitle?: string;
  renderHTML?: boolean;
  handleActionClick: (elem: any, action: IAction | undefined | null) => void;
  handleSourceDocumentsClick: (src: any) => void;
};

const defaultBackgroundColor = '#f7f8ff';
const defaultTextColor = '#303235';
const defaultFontSize = 16;
const defaultFeedbackColor = '#3B81F6';

export const BotBubble = (props: Props) => {
  let botDetailsEl: HTMLDetailsElement | undefined;

  Marked.setOptions({ isNoP: true, sanitize: props.renderHTML !== undefined ? !props.renderHTML : true });

  const [rating, setRating] = createSignal('');
  const [feedbackId, setFeedbackId] = createSignal('');
  const [showFeedbackContentDialog, setShowFeedbackContentModal] = createSignal(false);
  const [copiedMessage, setCopiedMessage] = createSignal(false);
  const [thumbsUpColor, setThumbsUpColor] = createSignal(props.feedbackColor ?? defaultFeedbackColor); // default color
  const [thumbsDownColor, setThumbsDownColor] = createSignal(props.feedbackColor ?? defaultFeedbackColor); // default color
  const [loadingStates, setLoadingStates] = createSignal<{ [key: number]: 'idle' | 'loading' | 'success' }>({});
  const [products, setProducts] = createSignal<
    { pageContent: string; price_pro: number; price: number; name: string; url: string; images_url: string[]; product_id: number }[]
  >([]);

  // Store a reference to the bot message element for the copyMessageToClipboard function
  const [botMessageElement, setBotMessageElement] = createSignal<HTMLElement | null>(null);

  const setBotMessageRef = (el: HTMLSpanElement) => {
    if (el) {
      el.innerHTML = Marked.parse(props.message.message);

      // Apply textColor to all links, headings, and other markdown elements except code
      const textColor = props.textColor ?? defaultTextColor;
      el.querySelectorAll('a, h1, h2, h3, h4, h5, h6, strong, em, blockquote, li').forEach((element) => {
        (element as HTMLElement).style.color = textColor;
      });

      // Code blocks (with pre) get white text
      el.querySelectorAll('pre').forEach((element) => {
        (element as HTMLElement).style.color = '#FFFFFF';
        // Also ensure any code elements inside pre have white text
        element.querySelectorAll('code').forEach((codeElement) => {
          (codeElement as HTMLElement).style.color = '#FFFFFF';
        });
      });

      // Inline code (not in pre) gets green text
      el.querySelectorAll('code:not(pre code)').forEach((element) => {
        (element as HTMLElement).style.color = '#4CAF50'; // Green color
      });

      // Set target="_blank" for links
      el.querySelectorAll('a').forEach((link) => {
        link.target = '_blank';
      });

      // Store the element ref for the copy function
      setBotMessageElement(el);

      if (props.message.rating) {
        setRating(props.message.rating);
        if (props.message.rating === 'THUMBS_UP') {
          setThumbsUpColor('#006400');
        } else if (props.message.rating === 'THUMBS_DOWN') {
          setThumbsDownColor('#8B0000');
        }
      }
      if (props.fileAnnotations && props.fileAnnotations.length) {
        for (const annotations of props.fileAnnotations) {
          const button = document.createElement('button');
          button.textContent = annotations.fileName;
          button.className =
            'py-2 px-4 mb-2 justify-center font-semibold text-white focus:outline-none flex items-center disabled:opacity-50 disabled:cursor-not-allowed disabled:brightness-100 transition-all filter hover:brightness-90 active:brightness-75 file-annotation-button';
          button.addEventListener('click', function () {
            downloadFile(annotations);
          });
          const svgContainer = document.createElement('div');
          svgContainer.className = 'ml-2';
          svgContainer.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" class="icon icon-tabler icon-tabler-download" width="24" height="24" viewBox="0 0 24 24" stroke-width="2" stroke="#ffffff" fill="none" stroke-linecap="round" stroke-linejoin="round"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2 -2v-2" /><path d="M7 11l5 5l5 -5" /><path d="M12 4l0 12" /></svg>`;

          button.appendChild(svgContainer);
          el.appendChild(button);
        }
      }
    }
  };

  const downloadFile = async (fileAnnotation: any) => {
    try {
      const response = await sendFileDownloadQuery({
        apiHost: props.apiHost,
        body: { fileName: fileAnnotation.fileName, chatflowId: props.chatflowid, chatId: props.chatId } as any,
        onRequest: props.onRequest,
      });
      const blob = new Blob([response.data]);
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = fileAnnotation.fileName;
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Download failed:', error);
    }
  };

  const copyMessageToClipboard = async () => {
    try {
      const text = botMessageElement() ? botMessageElement()?.textContent : '';
      await navigator.clipboard.writeText(text || '');
      setCopiedMessage(true);
      setTimeout(() => {
        setCopiedMessage(false);
      }, 2000); // Hide the message after 2 seconds
    } catch (error) {
      console.error('Error copying to clipboard:', error);
    }
  };

  const saveToLocalStorage = (rating: FeedbackRatingType) => {
    const chatDetails = localStorage.getItem(`${props.chatflowid}_EXTERNAL`);
    if (!chatDetails) return;
    try {
      const parsedDetails = JSON.parse(chatDetails);
      const messages: MessageType[] = parsedDetails.chatHistory || [];
      const message = messages.find((msg) => msg.messageId === props.message.messageId);
      if (!message) return;
      message.rating = rating;
      localStorage.setItem(`${props.chatflowid}_EXTERNAL`, JSON.stringify({ ...parsedDetails, chatHistory: messages }));
    } catch (e) {
      return;
    }
  };

  const isValidURL = (url: string): URL | undefined => {
    try {
      return new URL(url);
    } catch (err) {
      return undefined;
    }
  };

  const removeDuplicateURL = (message: MessageType) => {
    const visitedURLs: string[] = [];
    const newSourceDocuments: any = [];

    message.sourceDocuments.forEach((source: any) => {
      if (isValidURL(source.metadata.source) && !visitedURLs.includes(source.metadata.source)) {
        visitedURLs.push(source.metadata.source);
        newSourceDocuments.push(source);
      } else if (!isValidURL(source.metadata.source)) {
        newSourceDocuments.push(source);
      }
    });
    return newSourceDocuments;
  };

  const onThumbsUpClick = async () => {
    if (rating() === '') {
      const body = {
        chatflowid: props.chatflowid,
        chatId: props.chatId,
        messageId: props.message?.messageId as string,
        rating: 'THUMBS_UP' as FeedbackRatingType,
        content: '',
      };
      const result = await sendFeedbackQuery({
        chatflowid: props.chatflowid,
        apiHost: props.apiHost,
        body,
        onRequest: props.onRequest,
      });

      if (result.data) {
        const data = result.data as any;
        let id = '';
        if (data && data.id) id = data.id;
        setRating('THUMBS_UP');
        setFeedbackId(id);
        setShowFeedbackContentModal(true);
        // update the thumbs up color state
        setThumbsUpColor('#006400');
        saveToLocalStorage('THUMBS_UP');
      }
    }
  };

  const onThumbsDownClick = async () => {
    if (rating() === '') {
      const body = {
        chatflowid: props.chatflowid,
        chatId: props.chatId,
        messageId: props.message?.messageId as string,
        rating: 'THUMBS_DOWN' as FeedbackRatingType,
        content: '',
      };
      const result = await sendFeedbackQuery({
        chatflowid: props.chatflowid,
        apiHost: props.apiHost,
        body,
        onRequest: props.onRequest,
      });

      if (result.data) {
        const data = result.data as any;
        let id = '';
        if (data && data.id) id = data.id;
        setRating('THUMBS_DOWN');
        setFeedbackId(id);
        setShowFeedbackContentModal(true);
        // update the thumbs down color state
        setThumbsDownColor('#8B0000');
        saveToLocalStorage('THUMBS_DOWN');
      }
    }
  };

  const submitFeedbackContent = async (text: string) => {
    const body = {
      content: text,
    };
    const result = await updateFeedbackQuery({
      id: feedbackId(),
      apiHost: props.apiHost,
      body,
      onRequest: props.onRequest,
    });

    if (result.data) {
      setFeedbackId('');
      setShowFeedbackContentModal(false);
    }
  };

  onMount(() => {
    if (botDetailsEl && props.isLoading) {
      botDetailsEl.open = true;
    }
  });

  createEffect(() => {
    if (botDetailsEl && props.isLoading) {
      botDetailsEl.open = true;
    } else if (botDetailsEl && !props.isLoading) {
      botDetailsEl.open = false;
    }
  });

  // Extract products from artifacts and other sources
  createEffect(() => {
    // Reset products when message changes to allow new searches
    setProducts([]);

    const extractedProducts: {
      pageContent: string;
      price_pro: number;
      price: number;
      name: string;
      url: string;
      images_url: string[];
      product_id: number;
    }[] = [];

    // Extract from artifacts
    if (props.message.artifacts && props.message.artifacts.length > 0) {
      props.message.artifacts.forEach((artifact) => {
        if (artifact && artifact.data) {
          try {
            // Try to parse the artifact data as JSON
            const data = typeof artifact.data === 'string' ? JSON.parse(artifact.data) : artifact.data;

            // Check if it's an array of products
            if (Array.isArray(data)) {
              data.forEach((item) => {
                if (item && typeof item === 'object' && item.product_id && item.name) {
                  extractedProducts.push({
                    pageContent: item.pageContent || '',
                    price_pro: item.price_pro || item.price || 0,
                    price: item.price || 0,
                    name: item.name || '',
                    url: item.url || '',
                    images_url: Array.isArray(item.images_url) ? item.images_url : [item.images_url || ''],
                    product_id: item.product_id || 0,
                  });
                }
              });
            }
            // Check if it's a single product object
            else if (data && typeof data === 'object' && data.product_id && data.name) {
              extractedProducts.push({
                pageContent: data.pageContent || '',
                price_pro: data.price_pro || data.price || 0,
                price: data.price || 0,
                name: data.name || '',
                url: data.url || '',
                images_url: Array.isArray(data.images_url) ? data.images_url : [data.images_url || ''],
                product_id: data.product_id || 0,
              });
            }
          } catch (error) {}
        }
      });
    }

    // Extract from sourceDocuments (in case products are stored there)
    if (props.message.sourceDocuments && props.message.sourceDocuments.length > 0) {
      props.message.sourceDocuments.forEach((doc: any) => {
        if (doc && doc.pageContent) {
          try {
            // Try to parse pageContent as JSON
            const data = typeof doc.pageContent === 'string' ? JSON.parse(doc.pageContent) : doc.pageContent;

            if (Array.isArray(data)) {
              data.forEach((item) => {
                if (item && typeof item === 'object' && item.product_id && item.name) {
                  extractedProducts.push({
                    pageContent: item.pageContent || '',
                    price_pro: item.price_pro || item.price || 0,
                    price: item.price || 0,
                    name: item.name || '',
                    url: item.url || '',
                    images_url: Array.isArray(item.images_url) ? item.images_url : [item.images_url || ''],
                    product_id: item.product_id || 0,
                  });
                }
              });
            } else if (data && typeof data === 'object' && data.product_id && data.name) {
              extractedProducts.push({
                pageContent: data.pageContent || '',
                price_pro: data.price_pro || data.price || 0,
                price: data.price || 0,
                name: data.name || '',
                url: data.url || '',
                images_url: Array.isArray(data.images_url) ? data.images_url : [data.images_url || ''],
                product_id: data.product_id || 0,
              });
            }
          } catch (error) {
            // If pageContent is not JSON, it might contain product info in text format
            // This is a fallback - you might need to adjust based on your data format
          }
        }
      });
    }

    // Extract from calledTools first (often contains the tool call data)
    if (props.message.calledTools && props.message.calledTools.length > 0) {
      props.message.calledTools.forEach((tool: any) => {
        // Try different possible data structures in the tool
        const possibleDataSources = [tool?.toolOutput, tool?.output, tool?.result, tool?.data, tool?.args, tool];

        for (const dataSource of possibleDataSources) {
          if (dataSource && typeof dataSource === 'object') {
            try {
              let data = dataSource;
              if (typeof dataSource === 'string') {
                data = JSON.parse(dataSource);
              }

              if (Array.isArray(data)) {
                data.forEach((item) => {
                  if (item && typeof item === 'object' && item.product_id && item.name) {
                    extractedProducts.push({
                      pageContent: item.pageContent || '',
                      price_pro: item.price_pro || item.price || 0,
                      price: item.price || 0,
                      name: item.name || '',
                      url: item.url || '',
                      images_url: Array.isArray(item.images_url) ? item.images_url : [item.images_url || ''],
                      product_id: item.product_id || 0,
                    });
                  }
                });
              } else if (data && typeof data === 'object' && data.product_id && data.name) {
                extractedProducts.push({
                  pageContent: data.pageContent || '',
                  price_pro: data.price_pro || data.price || 0,
                  price: data.price || 0,
                  name: data.name || '',
                  url: data.url || '',
                  images_url: Array.isArray(data.images_url) ? data.images_url : [data.images_url || ''],
                  product_id: data.product_id || 0,
                });
              }
            } catch (error) {
              // Continue to next data source
            }
          }
        }
      });
    }

    // Extract from usedTools (where product search results are likely stored)
    if (props.message.usedTools && props.message.usedTools.length > 0) {
      props.message.usedTools.forEach((tool: any) => {
        // Try different possible data structures in the tool
        const possibleDataSources = [tool?.toolOutput, tool?.output, tool?.result, tool?.data, tool?.response, tool?.content];

        possibleDataSources.forEach((dataSource) => {
          if (dataSource) {
            try {
              let data;
              if (typeof dataSource === 'string') {
                // First, try standard JSON.parse
                try {
                  data = JSON.parse(dataSource);
                } catch (jsonError) {
                  // If JSON.parse fails, use Function constructor for JavaScript object notation
                  // This is safe here because the data comes from the trusted backend
                  try {
                    data = new Function('return ' + dataSource)();
                  } catch (fnError) {
                    throw fnError;
                  }
                }
              } else {
                data = dataSource;
              }

              // Helper function to extract products from data
              const extractProductsFromData = (data: any) => {
                if (Array.isArray(data)) {
                  data.forEach((item) => {
                    if (item && typeof item === 'object' && item.product_id && item.name) {
                      extractedProducts.push({
                        pageContent: item.pageContent || '',
                        price_pro: item.price_pro || item.price || 0,
                        price: item.price || 0,
                        name: item.name || '',
                        url: item.url || '',
                        images_url: Array.isArray(item.images_url) ? item.images_url : [item.images_url || ''],
                        product_id: item.product_id || 0,
                      });
                    }
                  });
                } else if (data && typeof data === 'object' && data.product_id && data.name) {
                  extractedProducts.push({
                    pageContent: data.pageContent || '',
                    price_pro: data.price_pro || data.price || 0,
                    price: data.price || 0,
                    name: data.name || '',
                    url: data.url || '',
                    images_url: Array.isArray(data.images_url) ? data.images_url : [data.images_url || ''],
                    product_id: data.product_id || 0,
                  });
                }
                // Check if data contains a products array or similar
                else if (data && typeof data === 'object') {
                  const possibleProductKeys = ['products', 'results', 'items', 'data'];
                  possibleProductKeys.forEach((key) => {
                    if (data[key] && Array.isArray(data[key])) {
                      extractProductsFromData(data[key]);
                    }
                  });
                }
              };

              extractProductsFromData(data);
            } catch (error) {
              // Silently ignore parsing errors
            }
          }
        });
      });
    }

    // Extract from agentFlowExecutedData (another possible source)
    if (props.message.agentFlowExecutedData && props.message.agentFlowExecutedData.length > 0) {
      props.message.agentFlowExecutedData.forEach((flowData: any) => {
        if (flowData && flowData.data) {
          try {
            const data = typeof flowData.data === 'string' ? JSON.parse(flowData.data) : flowData.data;

            if (Array.isArray(data)) {
              data.forEach((item) => {
                if (item && typeof item === 'object' && item.product_id && item.name) {
                  extractedProducts.push({
                    pageContent: item.pageContent || '',
                    price_pro: item.price_pro || item.price || 0,
                    price: item.price || 0,
                    name: item.name || '',
                    url: item.url || '',
                    images_url: Array.isArray(item.images_url) ? item.images_url : [item.images_url || ''],
                    product_id: item.product_id || 0,
                  });
                }
              });
            } else if (data && typeof data === 'object' && data.product_id && data.name) {
              extractedProducts.push({
                pageContent: data.pageContent || '',
                price_pro: data.price_pro || data.price || 0,
                price: data.price || 0,
                name: data.name || '',
                url: data.url || '',
                images_url: Array.isArray(data.images_url) ? data.images_url : [data.images_url || ''],
                product_id: data.product_id || 0,
              });
            }
          } catch (error) {
            // Error parsing agentFlowExecutedData
          }
        }
      });
    }

    if (extractedProducts.length > 0) {
      setProducts(extractedProducts);
    }
  });

  const renderArtifacts = (item: Partial<FileUpload>) => {
    // Instead of onMount, we'll use a callback ref to apply styles
    const setArtifactRef = (el: HTMLSpanElement) => {
      if (el) {
        const textColor = props.textColor ?? defaultTextColor;
        // Apply textColor to all elements except code blocks
        el.querySelectorAll('a, h1, h2, h3, h4, h5, h6, strong, em, blockquote, li').forEach((element) => {
          (element as HTMLElement).style.color = textColor;
        });

        // Code blocks (with pre) get white text
        el.querySelectorAll('pre').forEach((element) => {
          (element as HTMLElement).style.color = '#FFFFFF';
          // Also ensure any code elements inside pre have white text
          element.querySelectorAll('code').forEach((codeElement) => {
            (codeElement as HTMLElement).style.color = '#FFFFFF';
          });
        });

        // Inline code (not in pre) gets green text
        el.querySelectorAll('code:not(pre code)').forEach((element) => {
          (element as HTMLElement).style.color = '#4CAF50'; // Green color
        });

        el.querySelectorAll('a').forEach((link) => {
          link.target = '_blank';
        });
      }
    };

    return (
      <>
        <Show when={item.type === 'png' || item.type === 'jpeg'}>
          <div class="flex items-center justify-center p-0 m-0">
            <img
              class="w-full h-full bg-cover"
              src={(() => {
                const isFileStorage = typeof item.data === 'string' && item.data.startsWith('FILE-STORAGE::');
                return isFileStorage
                  ? `${props.apiHost}/api/v1/get-upload-file?chatflowId=${props.chatflowid}&chatId=${props.chatId}&fileName=${(
                      item.data as string
                    ).replace('FILE-STORAGE::', '')}`
                  : (item.data as string);
              })()}
            />
          </div>
        </Show>
        <Show when={item.type === 'html'}>
          <div class="mt-2">
            <div innerHTML={item.data as string} />
          </div>
        </Show>
        <Show when={item.type !== 'png' && item.type !== 'jpeg' && item.type !== 'html'}>
          <span
            ref={setArtifactRef}
            innerHTML={Marked.parse(item.data as string)}
            class="prose"
            style={{
              'background-color': props.backgroundColor ?? defaultBackgroundColor,
              color: props.textColor ?? defaultTextColor,
              'border-radius': '6px',
              'font-size': props.fontSize ? `${props.fontSize}px` : `${defaultFontSize}px`,
            }}
          />
        </Show>
      </>
    );
  };

  const formatDateTime = (dateTimeString: string | undefined, showDate: boolean | undefined, showTime: boolean | undefined) => {
    if (!dateTimeString) return '';

    try {
      const date = new Date(dateTimeString);

      // Check if the date is valid
      if (isNaN(date.getTime())) {
        console.error('Invalid ISO date string:', dateTimeString);
        return '';
      }

      let formatted = '';

      if (showDate) {
        const dateFormatter = new Intl.DateTimeFormat('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        });
        const [{ value: month }, , { value: day }, , { value: year }] = dateFormatter.formatToParts(date);
        formatted = `${month.charAt(0).toUpperCase() + month.slice(1)} ${day}, ${year}`;
      }

      if (showTime) {
        const timeFormatter = new Intl.DateTimeFormat('en-US', {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true,
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        });
        const timeString = timeFormatter.format(date).toLowerCase();
        formatted = formatted ? `${formatted}, ${timeString}` : timeString;
      }

      return formatted;
    } catch (error) {
      console.error('Error formatting date:', error);
      return '';
    }
  };
  // Products will be processed in createEffect
  const getToken = () => {
    let token = null;
    // @ts-ignore
    // Check in global `prestashop` object
    if (typeof window.prestashop !== 'undefined' && window.prestashop.static_token) {
      // @ts-ignore

      token = window.prestashop.static_token;
    } else {
      // Look for token in a meta tag or hidden input (if rendered in the page)
      const tokenMeta = document.querySelector('meta[name="csrf-token"]');
      if (tokenMeta) {
        // @ts-ignore

        token = tokenMeta.content;
      } else {
        const tokenInput = document.querySelector('input[name="token"]');
        if (tokenInput) {
          // @ts-ignore

          token = tokenInput.value;
        }
      }
    }

    return token;
  };
  const addToCart = async (productId: number, quantity: number) => {
    setLoadingStates((prev) => ({ ...prev, [productId]: 'loading' }));

    const url = '/panier';
    const formData = new URLSearchParams();

    // Set necessary parameters
    formData.append('id_product', productId.toString());
    formData.append('qty', quantity.toString());
    formData.append('add', '1');
    formData.append('action', 'update');
    formData.append('id_customization', '0');
    // Include product attribute if applicable
    // Include the CSRF token if available
    const formToken = getToken();
    if (formToken) {
      formData.append('token', formToken);
    }

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          Accept: 'application/json, text/javascript, */*; q=0.01',
          'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        },
        body: formData.toString(),
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Product added to cart:', data);
        setLoadingStates((prev) => ({ ...prev, [productId]: 'success' }));
        setTimeout(() => {
          setLoadingStates((prev) => ({ ...prev, [productId]: 'idle' }));
        }, 3000);

        // Send GTM event with chatbot information
        const product = products().find((p) => p.product_id === productId);
        if (product) {
          //@ts-ignore
          window.dataLayer = window.dataLayer || [];
          //@ts-ignore

          window.dataLayer.push({
            event: 'add_to_cart',
            ecommerce: {
              currencyCode: (window as any).prestashop?.currency?.iso_code || 'EUR',
              add: {
                products: [
                  {
                    name: product.name,
                    id: product.product_id.toString(),
                    price: (window as any).prestashop?.customer?.is_pro ? product.price_pro : product.price,
                    quantity: quantity,
                  },
                ],
              },
            },
            chatbotInfo: {
              source: 'chatbot',
              chatflowId: props.chatflowid,
              chatId: props.chatId,
              messageId: props.message.messageId,
            },
          });
        }

        // @ts-ignore
        window.prestashop.emit('updateCart', {
          reason: {
            idProduct: data.id_product,
            idProductAttribute: data.id_product_attribute,
            idCustomization: data.id_customization,
            linkAction: 'add-to-cart',
            cart: data.cart,
          },
          resp: data,
        });
      } else {
        const data = await response.json();
        // @ts-ignore

        prestashop.emit('handleError', {
          eventType: 'addProductToCart',
          data,
        });
        console.error('Failed to add product to cart:', response.statusText);
        setLoadingStates((prev) => ({ ...prev, [productId]: 'idle' }));
      }
    } catch (error) {
      console.error('Error adding product to cart:', error);
      setLoadingStates((prev) => ({ ...prev, [productId]: 'idle' }));
    }
  };

  const formatPrice = (price: number, isPro: boolean = false) => {
    const currency = (window as any).prestashop?.currency;
    if (!currency) {
      // Fallback to default formatting if prestashop currency is not available
      return `${price.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}€`;
    }

    const formattedPrice = new Intl.NumberFormat(currency.iso_code === 'EUR' ? 'de-DE' : 'en-US', {
      style: 'currency',
      currency: currency.iso_code,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(price);

    // Replace the currency symbol with the one from prestashop
    const priceWithCorrectSymbol = formattedPrice.replace(/[€$£¥]/g, currency.sign);

    return isPro ? `${priceWithCorrectSymbol} HT` : priceWithCorrectSymbol;
  };

  // Example usage
  return (
    <div>
      {products().length > 0 && (
        <div class="px-4 py-2  ml-2 scrollbar max-w-full prose relative">
          <div class="relative">
            <div class="overflow-x-auto products-container" style="scroll-behavior: smooth;">
              <div class="flex space-x-4 pb-4 w-max">
                <For each={products()}>
                  {(product) => (
                    <div
                      class="flex-shrink-0 w-36 sm:w-40 md:w-48 border rounded-lg p-2 hover:border-[#e71e62] cursor-pointer flex flex-col justify-between"
                      onClick={() => window.open(product.url, '_blank')}
                    >
                      <div>
                        <img
                          src={product.images_url[0]}
                          alt={product.name}
                          class="w-full h-auto object-cover mb-2 rounded"
                          onError={(e) => {
                            const imgElement = e.target as HTMLImageElement;
                            if (imgElement.src.endsWith('.webp')) {
                              imgElement.src = imgElement.src.replace(/\.webp$/, '.jpg');
                            }
                          }}
                        />
                        <h5 class="font-bold text-sm line-clamp-2">{product.name}</h5>
                      </div>
                      <div class="flex justify-between items-center mt-2">
                        <p class="font-semibold text-sm">
                          {(window as any).prestashop?.customer?.is_pro ? formatPrice(product.price, true) : formatPrice(product.price)}
                        </p>
                        <button
                          class="p-2 bg-black hover:bg-[#e71e62] hover:transition-colors hover:duration-150 text-white rounded-md flex items-center justify-center"
                          style={{ width: '32px', height: '32px' }}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (loadingStates()[product.product_id] !== 'loading') {
                              addToCart(product.product_id, 1);
                            }
                          }}
                        >
                          {loadingStates()[product.product_id] === 'loading' ? (
                            <div class="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></div>
                          ) : loadingStates()[product.product_id] === 'success' ? (
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                              <path
                                fill-rule="evenodd"
                                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                clip-rule="evenodd"
                              />
                            </svg>
                          ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                            </svg>
                          )}
                        </button>
                      </div>
                    </div>
                  )}
                </For>
              </div>
            </div>
          </div>
        </div>
      )}
      <div class="flex flex-row justify-start mb-2 items-start host-container" style={{ 'margin-right': '50px' }}>
        <Show when={props.showAvatar}>
          <Avatar initialAvatarSrc={props.avatarSrc} />
        </Show>
        <div class="flex flex-col  w-full justify-start">
          <div class="flex flex-col justify-start">
            {props.showAgentMessages &&
              props.message.agentFlowExecutedData &&
              Array.isArray(props.message.agentFlowExecutedData) &&
              props.message.agentFlowExecutedData.length > 0 && (
                <div>
                  <WorkflowTreeView workflowData={props.message.agentFlowExecutedData} indentationLevel={24} />
                </div>
              )}
            {props.showAgentMessages && props.message.agentReasoning && (
              <details ref={botDetailsEl} class="mb-2 px-4 py-2 ml-2 chatbot-host-bubble rounded-[6px]">
                <summary class="cursor-pointer">
                  <span class="italic">Agent Messages</span>
                </summary>
                <br />
                <For each={props.message.agentReasoning}>
                  {(agent) => {
                    const agentMessages = agent.messages ?? [];
                    let msgContent = agent.instructions || (agentMessages.length > 1 ? agentMessages.join('\\n') : agentMessages[0]);
                    if (agentMessages.length === 0 && !agent.instructions) msgContent = `<p>Finished</p>`;
                    return (
                      <AgentReasoningBubble
                        agentName={agent.agentName ?? ''}
                        agentMessage={msgContent}
                        agentArtifacts={agent.artifacts}
                        backgroundColor={props.backgroundColor}
                        textColor={props.textColor}
                        fontSize={props.fontSize}
                        apiHost={props.apiHost}
                        chatflowid={props.chatflowid}
                        chatId={props.chatId}
                        renderHTML={props.renderHTML}
                      />
                    );
                  }}
                </For>
              </details>
            )}
            {props.message.artifacts && props.message.artifacts.length > 0 && (
              <div class="flex flex-row items-start flex-wrap w-full gap-2">
                <For each={props.message.artifacts}>
                  {(item) => {
                    return item !== null ? <>{renderArtifacts(item)}</> : null;
                  }}
                </For>
              </div>
            )}

            {props.message.message && (
              <span
                ref={setBotMessageRef}
                class="px-4 py-2 ml-2 max-w-full chatbot-host-bubble prose"
                data-testid="host-bubble"
                style={{
                  'background-color': props.backgroundColor ?? defaultBackgroundColor,
                  color: props.textColor ?? defaultTextColor,
                  'border-radius': '6px',
                  'font-size': props.fontSize ? `${props.fontSize}px` : `${defaultFontSize}px`,
                }}
              />
            )}
            {props.message.action && (
              <div class="px-4 py-2 flex flex-row justify-start space-x-2">
                <For each={props.message.action.elements || []}>
                  {(action) => {
                    return (
                      <>
                        {(action.type === 'approve-button' && action.label === 'Yes') || action.type === 'agentflowv2-approve-button' ? (
                          <button
                            type="button"
                            class="px-4 py-2 font-medium text-green-600 border border-green-600 rounded-full hover:bg-green-600 hover:text-white transition-colors duration-300 flex items-center space-x-2"
                            onClick={() => props.handleActionClick(action, props.message.action)}
                          >
                            <TickIcon />
                            &nbsp;
                            {action.label}
                          </button>
                        ) : (action.type === 'reject-button' && action.label === 'No') || action.type === 'agentflowv2-reject-button' ? (
                          <button
                            type="button"
                            class="px-4 py-2 font-medium text-red-600 border border-red-600 rounded-full hover:bg-red-600 hover:text-white transition-colors duration-300 flex items-center space-x-2"
                            onClick={() => props.handleActionClick(action, props.message.action)}
                          >
                            <XIcon isCurrentColor={true} />
                            &nbsp;
                            {action.label}
                          </button>
                        ) : (
                          <button>{action.label}</button>
                        )}
                      </>
                    );
                  }}
                </For>
              </div>
            )}
          </div>
        </div>
        <div>
          {props.message.sourceDocuments && props.message.sourceDocuments.length && (
            <>
              <Show when={props.sourceDocsTitle}>
                <span class="px-2 py-[10px] font-semibold">{props.sourceDocsTitle}</span>
              </Show>
              <div style={{ display: 'flex', 'flex-direction': 'row', width: '100%', 'flex-wrap': 'wrap' }}>
                <For each={[...removeDuplicateURL(props.message)]}>
                  {(src) => {
                    const URL = isValidURL(src.metadata.source);
                    return (
                      <SourceBubble
                        pageContent={URL ? URL.pathname : src.pageContent}
                        metadata={src.metadata}
                        onSourceClick={() => {
                          if (URL) {
                            window.open(src.metadata.source, '_blank');
                          } else {
                            props.handleSourceDocumentsClick(src);
                          }
                        }}
                      />
                    );
                  }}
                </For>
              </div>
            </>
          )}
        </div>
        <div>
          {props.chatFeedbackStatus && props.message.messageId && (
            <>
              <div class={`flex items-center px-2 pb-2 ${props.showAvatar ? 'ml-10' : ''}`}>
                <CopyToClipboardButton feedbackColor={props.feedbackColor} onClick={() => copyMessageToClipboard()} />
                <Show when={copiedMessage()}>
                  <div class="copied-message" style={{ color: props.feedbackColor ?? defaultFeedbackColor }}>
                    Copied!
                  </div>
                </Show>
                {rating() === '' || rating() === 'THUMBS_UP' ? (
                  <ThumbsUpButton feedbackColor={thumbsUpColor()} isDisabled={rating() === 'THUMBS_UP'} rating={rating()} onClick={onThumbsUpClick} />
                ) : null}
                {rating() === '' || rating() === 'THUMBS_DOWN' ? (
                  <ThumbsDownButton
                    feedbackColor={thumbsDownColor()}
                    isDisabled={rating() === 'THUMBS_DOWN'}
                    rating={rating()}
                    onClick={onThumbsDownClick}
                  />
                ) : null}
                <Show when={props.message.dateTime}>
                  <div class="text-sm text-gray-500 ml-2">
                    {formatDateTime(props.message.dateTime, props?.dateTimeToggle?.date, props?.dateTimeToggle?.time)}
                  </div>
                </Show>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
