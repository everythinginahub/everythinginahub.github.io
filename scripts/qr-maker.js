import QRCode from 'qrcode';

export function contrastRatio(first,second) {
  const luminance=hex=>{
    if(!/^#[0-9a-f]{6}$/i.test(hex))throw new Error('Choose valid foreground and background colours.');
    const channels=[1,3,5].map(index=>parseInt(hex.slice(index,index+2),16)/255).map(value=>value<=.04045?value/12.92:((value+.055)/1.055)**2);
    return .2126*channels[0]+.7152*channels[1]+.0722*channels[2];
  };
  const [light,dark]=[luminance(first),luminance(second)].sort((a,b)=>b-a);
  return (light+.05)/(dark+.05);
}

export function mountQrMaker({root,encoder=QRCode}) {
  const form=root.querySelector('#miniQrForm');
  const textInput=root.querySelector('#miniQrText');
  const foreground=root.querySelector('#miniQrForeground');
  const background=root.querySelector('#miniQrBackground');
  const sizeInput=root.querySelector('#miniQrSize');
  const status=root.querySelector('#miniQrStatus');
  const output=root.querySelector('#miniQrOutput');
  const image=root.querySelector('#miniQrImage');
  const encoded=root.querySelector('#miniQrEncoded');
  const download=root.querySelector('#miniQrDownload');
  const submit=form.querySelector('[type="submit"]');
  let alive=true,generated='',pending=Promise.resolve(),request=0,busy=false;
  submit.disabled=false;

  function invalidate() {
    const hadOutput=Boolean(generated),hadPendingWork=busy;
    request++;busy=false;submit.disabled=false;
    if(hadOutput){generated='';output.hidden=true;image.removeAttribute('src');download.removeAttribute('href');}
    if(hadOutput)status.textContent='Your edits are ready. Generate a new QR code to update the preview.';
    else if(hadPendingWork)status.textContent='Your edits changed. Generate a new QR code to preview them.';
  }

  async function generate(event) {
    event.preventDefault();
    const text=textInput.value.trim();
    if(!text){status.textContent='Enter some text or a website address first.';textInput.focus();return;}
    if(text.length>1200){status.textContent='Please keep the content under 1,200 characters.';textInput.focus();return;}
    let ratio;
    try{ratio=contrastRatio(foreground.value,background.value);}catch{status.textContent='Choose valid colours for the QR code.';return;}
    if(ratio<4.5){status.textContent='Those colours are too similar for reliable scanning. Choose a darker foreground or lighter background.';return;}
    const requestId=++request;busy=true;submit.disabled=true;status.textContent='Creating your QR code…';
    try{
      const dataUrl=await encoder.toDataURL(text,{
        errorCorrectionLevel:'M',margin:2,width:Number(sizeInput.value),
        color:{dark:foreground.value,light:background.value}
      });
      if(!alive||requestId!==request)return;
      generated=text;image.src=dataUrl;image.alt='QR code preview for the text shown below';encoded.textContent=text;
      download.href=dataUrl;download.download='everything-hub-qr.png';output.hidden=false;
      status.textContent='QR code ready. Download the PNG or scan the preview to check it.';
    }catch{
      if(alive&&requestId===request){output.hidden=true;status.textContent='Could not create that QR code. Try shorter text or a different set of colours.';}
    }finally{if(alive&&requestId===request){busy=false;submit.disabled=false;}}
  }

  function onSubmit(event) { pending=generate(event); }

  form.addEventListener('submit',onSubmit);
  form.addEventListener('input',invalidate);
  form.addEventListener('change',invalidate);
  return {whenIdle(){return pending;},destroy(){alive=false;form.removeEventListener('submit',onSubmit);form.removeEventListener('input',invalidate);form.removeEventListener('change',invalidate);}};
}
