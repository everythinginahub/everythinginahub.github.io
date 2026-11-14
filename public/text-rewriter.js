const SAMPLE_TEXT = `At this point in time, our community library is expanding its evening opening hours in order to make use of the building more effectively. It is important to note that this change was made due to the fact that many local residents asked for more time to study and read. We will review the schedule after three months.`;

const LIGHT_RULES = [
  [/\bat this point in time\b/gi, 'now'],
  [/\bin order to\b/gi, 'to'],
  [/\bmake use of\b/gi, 'use'],
  [/\bdue to the fact that\b/gi, 'because'],
  [/\bfor the purpose of\b/gi, 'for'],
  [/\bwith regard to\b/gi, 'about'],
  [/\bin the event that\b/gi, 'if'],
  [/\bprior to\b/gi, 'before'],
  [/\bsubsequent to\b/gi, 'after'],
  [/\beach and every\b/gi, 'every'],
  [/\bin my personal opinion\b/gi, 'in my opinion']
];

const CONCISE_RULES = [
  ...LIGHT_RULES,
  [/\bit is important to note that\b/gi, 'note that'],
  [/\bit should be noted that\b/gi, 'note that'],
  [/\ba large number of\b/gi, 'many'],
  [/\bthe majority of\b/gi, 'most'],
  [/\ba majority of\b/gi, 'most'],
  [/\bthe reason is because\b/gi, 'the reason is that'],
  [/\bin close proximity to\b/gi, 'near'],
  [/\bhas the ability to\b/gi, 'can'],
  [/\bis able to\b/gi, 'can'],
  [/\bare able to\b/gi, 'can'],
  [/\bwas able to\b/gi, 'could'],
  [/\bwere able to\b/gi, 'could'],
  [/\bthe final outcome\b/gi, 'the outcome'],
  [/\bpast history\b/gi, 'history'],
  [/\bbasic fundamentals\b/gi, 'fundamentals']
];

const FORMAL_EXPANSIONS = [
  [/\bcan't\b/gi, 'cannot'],
  [/\bwon't\b/gi, 'will not'],
  [/\bdon't\b/gi, 'do not'],
  [/\bdoesn't\b/gi, 'does not'],
  [/\bdidn't\b/gi, 'did not'],
  [/\bisn't\b/gi, 'is not'],
  [/\baren't\b/gi, 'are not'],
  [/\bwasn't\b/gi, 'was not'],
  [/\bweren't\b/gi, 'were not'],
  [/\bhaven't\b/gi, 'have not'],
  [/\bhasn't\b/gi, 'has not'],
  [/\bhadn't\b/gi, 'had not'],
  [/\bwouldn't\b/gi, 'would not'],
  [/\bcouldn't\b/gi, 'could not'],
  [/\bshouldn't\b/gi, 'should not']
];

const FRIENDLY_CONTRACTIONS = [
  [/\bdo not\b/gi, "don't"],
  [/\bdoes not\b/gi, "doesn't"],
  [/\bdid not\b/gi, "didn't"],
  [/\bcannot\b/gi, "can't"],
  [/\bcan not\b/gi, "can't"],
  [/\bwill not\b/gi, "won't"],
  [/\bwould not\b/gi, "wouldn't"],
  [/\bcould not\b/gi, "couldn't"],
  [/\bshould not\b/gi, "shouldn't"],
  [/\bI am\b/g, "I'm"],
  [/\b(you|we|they) are\b/gi, "$1're"],
  [/\b(it|that|there|here|what|who) is\b/gi, "$1's"],
  [/\bI have\b/g, "I've"],
  [/\b(you|we|they) have\b/gi, "$1've"]
];

function preserveInitialCase(source, replacement) {
  if (source.toLocaleUpperCase() === source) return replacement.toLocaleUpperCase();
  if (source[0] && source[0] === source[0].toLocaleUpperCase()) {
    return replacement[0].toLocaleUpperCase() + replacement.slice(1);
  }
  return replacement;
}

function replaceRules(source, rules) {
  let text = source;
  let edits = 0;
  for (const [pattern, replacement] of rules) {
    text = text.replace(pattern, (match, ...args) => {
      edits += 1;
      const captures = args.slice(0, -2);
      const resolved = replacement.replace(/\$(\d)/g, (_, index) => captures[Number(index) - 1] ?? '');
      return preserveInitialCase(match, resolved);
    });
  }
  return {text, edits};
}

function normalizeText(text) {
  return text
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n[ \t]+/g, '\n')
    .replace(/\s+([,.;!?])/g, '$1')
    .replace(/([.!?])([A-Za-z])/g, '$1 $2')
    .replace(/(^|[.!?]\s+)([a-z])/g, (_, prefix, letter) => prefix + letter.toLocaleUpperCase())
    .trim();
}

export function countTextWords(text) {
  return (String(text).match(/[\p{L}\p{N}]+(?:['’][\p{L}\p{N}]+)*/gu) || []).length;
}

export function countTextSentences(text) {
  const trimmed = String(text).trim();
  return trimmed ? (trimmed.match(/[^.!?]+[.!?]+|[^.!?]+$/g) || []).filter(sentence => sentence.trim()).length : 0;
}

export function editForClarity(source, style = 'clear') {
  const input = String(source ?? '');
  const rules = style === 'light' ? LIGHT_RULES : CONCISE_RULES;
  const rewritten = replaceRules(input, rules);
  let text = rewritten.text;
  let edits = rewritten.edits;

  if (style === 'friendly') {
    const contracted = replaceRules(text, FRIENDLY_CONTRACTIONS);
    text = contracted.text;
    edits += contracted.edits;
  } else if (style === 'formal') {
    const expanded = replaceRules(text, FORMAL_EXPANSIONS);
    text = expanded.text;
    edits += expanded.edits;
  }

  const normalized = normalizeText(text);
  if (normalized !== text) edits += 1;

  return {
    text: normalized,
    edits,
    words: countTextWords(normalized),
    sentences: countTextSentences(normalized)
  };
}

export function textRewriterView() {
  return `<div class="text-editor-app">
    <div class="text-editor-notice" role="note"><strong>Offline clarity editor</strong><span>Edits run in this browser. There is no AI detector, score, or claim about who wrote a text. Review suggestions and keep your own voice.</span></div>
    <div class="text-editor-toolbar">
      <label for="textEditStyle">Editing style
        <select id="textEditStyle">
          <option value="light">Light polish</option>
          <option value="clear" selected>Clear &amp; concise</option>
          <option value="friendly">Friendly</option>
          <option value="formal">Formal (no contractions)</option>
        </select>
      </label>
      <div class="text-editor-actions">
        <button type="button" class="btn dark" id="textEditRun">Improve draft</button>
        <button type="button" class="text-editor-secondary" id="textEditSample">Load sample</button>
        <button type="button" class="text-editor-secondary" id="textEditClear">Clear</button>
      </div>
    </div>
    <div class="text-editor-workspace">
      <section class="text-editor-column" aria-labelledby="textEditInputLabel">
        <div class="text-editor-column-head"><label id="textEditInputLabel" for="textEditInput">Your draft</label><span id="textEditInputCount">0 words</span></div>
        <textarea id="textEditInput" rows="12" placeholder="Paste or write a draft to improve clarity and flow…" spellcheck="true"></textarea>
      </section>
      <section class="text-editor-column" aria-labelledby="textEditOutputLabel">
        <div class="text-editor-column-head"><label id="textEditOutputLabel" for="textEditOutput">Suggested edit</label><span id="textEditOutputCount">0 words</span></div>
        <textarea id="textEditOutput" rows="12" placeholder="Your suggested edit will appear here. You can edit it before copying." spellcheck="true"></textarea>
      </section>
    </div>
    <div class="text-editor-result-row">
      <p id="textEditStatus" class="text-editor-status" role="status" aria-live="polite">Your text stays on this device. Nothing is saved when you leave.</p>
      <div class="text-editor-actions"><button type="button" class="text-editor-secondary" id="textEditUse">Use edit as draft</button><button type="button" class="text-editor-secondary" id="textEditCopy">Copy edit</button></div>
    </div>
  </div>`;
}

export function mountTextRewriter({root, win = window}) {
  const $ = selector => root.querySelector(selector);
  const input = $('#textEditInput');
  const output = $('#textEditOutput');
  const style = $('#textEditStyle');
  const status = $('#textEditStatus');
  if (!input || !output || !style || !status) return {destroy() {}};

  const updateCounts = () => {
    $('#textEditInputCount').textContent = `${countTextWords(input.value)} words`;
    $('#textEditOutputCount').textContent = `${countTextWords(output.value)} words`;
  };
  const edit = () => {
    if (!input.value.trim()) {
      status.textContent = 'Add a draft first, then choose Improve draft.';
      input.focus();
      return;
    }
    const result = editForClarity(input.value, style.value);
    output.value = result.text;
    updateCounts();
    status.textContent = `${result.edits} light ${result.edits === 1 ? 'edit' : 'edits'} suggested · ${result.words} words · ${result.sentences} sentences. Review the wording before using it.`;
  };
  const loadSample = () => {
    input.value = SAMPLE_TEXT;
    updateCounts();
    input.focus();
    status.textContent = 'Sample loaded. Choose Improve draft to see a clarity-focused edit.';
  };
  const clear = () => {
    input.value = '';
    output.value = '';
    updateCounts();
    status.textContent = 'Draft and suggested edit cleared.';
    input.focus();
  };
  const useEdit = () => {
    if (!output.value.trim()) {
      status.textContent = 'There is no suggested edit to use yet.';
      return;
    }
    input.value = output.value;
    updateCounts();
    status.textContent = 'The suggested edit is now your draft. Make any final changes you like.';
    input.focus();
  };
  const copy = async () => {
    if (!output.value.trim()) {
      status.textContent = 'There is no suggested edit to copy yet.';
      return;
    }
    try {
      if (!win.navigator.clipboard?.writeText) throw new Error('Clipboard unavailable');
      await win.navigator.clipboard.writeText(output.value);
      status.textContent = 'Suggested edit copied to the clipboard.';
    } catch {
      output.focus();
      output.select();
      status.textContent = 'Clipboard access is unavailable. The suggested edit is selected so you can copy it manually.';
    }
  };

  const onInput = () => updateCounts();
  const onClick = event => {
    const button = event.target.closest('button');
    if (!button) return;
    if (button.id === 'textEditRun') edit();
    else if (button.id === 'textEditSample') loadSample();
    else if (button.id === 'textEditClear') clear();
    else if (button.id === 'textEditUse') useEdit();
    else if (button.id === 'textEditCopy') copy();
  };
  const onKeyDown = event => {
    if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
      event.preventDefault();
      edit();
    }
  };
  input.addEventListener('input', onInput);
  output.addEventListener('input', onInput);
  root.addEventListener('click', onClick);
  root.addEventListener('keydown', onKeyDown);
  updateCounts();

  return {
    edit,
    destroy() {
      input.removeEventListener('input', onInput);
      output.removeEventListener('input', onInput);
      root.removeEventListener('click', onClick);
      root.removeEventListener('keydown', onKeyDown);
    }
  };
}
