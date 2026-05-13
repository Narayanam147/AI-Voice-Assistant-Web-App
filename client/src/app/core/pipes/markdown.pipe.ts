import { Pipe, PipeTransform } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

/**
 * Converts basic markdown to safe HTML:
 * **bold**, *italic*, `code`, numbered lists, bullet lists, line breaks
 */
@Pipe({ name: 'markdown', standalone: true, pure: true })
export class MarkdownPipe implements PipeTransform {
  constructor(private sanitizer: DomSanitizer) {}

  transform(text: string): SafeHtml {
    if (!text) return '';

    let html = text
      // Escape HTML special chars first
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')

      // Headers (## Heading)
      .replace(/^### (.+)$/gm, '<h4>$1</h4>')
      .replace(/^## (.+)$/gm, '<h3>$1</h3>')
      .replace(/^# (.+)$/gm, '<h2>$1</h2>')

      // Bold & italic
      .replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')

      // Inline code
      .replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>')

      // Numbered list items: "1. text" → wrap in <ol><li>
      .replace(/^\d+\. (.+)$/gm, '<li class="num-li">$1</li>')

      // Bullet list items: "- text" or "* text"
      .replace(/^[-•*] (.+)$/gm, '<li class="bul-li">$1</li>')

      // Wrap consecutive <li class="num-li"> in <ol>
      .replace(/(<li class="num-li">.*?<\/li>)(\s*<li class="num-li">.*?<\/li>)*/gs,
        '<ol class="md-ol">$&</ol>')

      // Wrap consecutive <li class="bul-li"> in <ul>
      .replace(/(<li class="bul-li">.*?<\/li>)(\s*<li class="bul-li">.*?<\/li>)*/gs,
        '<ul class="md-ul">$&</ul>')

      // Double newline → paragraph break
      .replace(/\n{2,}/g, '</p><p class="md-p">')

      // Single newline → <br>
      .replace(/\n/g, '<br>');

    html = `<p class="md-p">${html}</p>`;

    return this.sanitizer.bypassSecurityTrustHtml(html);
  }
}
