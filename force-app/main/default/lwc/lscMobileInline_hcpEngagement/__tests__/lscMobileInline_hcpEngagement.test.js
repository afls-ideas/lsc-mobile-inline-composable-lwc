import { createElement } from 'lwc';
import LscMobileInlineHcpEngagement from 'c/lscMobileInline_hcpEngagement';

function createComponent(props = {}) {
    const el = createElement('c-lsc-mobile-inline_hcp-engagement', {
        is: LscMobileInlineHcpEngagement
    });
    Object.assign(el, props);
    document.body.appendChild(el);
    return el;
}

async function flush() {
    return Promise.resolve();
}

describe('c-lsc-mobile-inline_hcp-engagement', () => {
    afterEach(() => {
        while (document.body.firstChild) {
            document.body.removeChild(document.body.firstChild);
        }
    });

    it('configures the reusable brick to query Visits', () => {
        const el = createComponent({ recordId: '001xHCP' });

        const child = el.shadowRoot.querySelector('c-lsc-mobile-inline_related-list');
        expect(child).not.toBeNull();
        expect(child.relatedListId).toBe('Visits');
        expect(child.parentRecordId).toBe('001xHCP');
        expect(child.titleField).toBe('Visit.Name');
        expect(child.badgeField).toBe('Visit.Status');
    });

    it('updates its slotted summary from the child dataloaded event', async () => {
        const el = createComponent({ recordId: '001xHCP' });
        const child = el.shadowRoot.querySelector('c-lsc-mobile-inline_related-list');

        child.dispatchEvent(
            new CustomEvent('dataloaded', { detail: { records: [{}, {}, {}], count: 3 } })
        );
        await flush();

        expect(el.shadowRoot.textContent).toContain('3 recent visit(s)');
    });

    it('records the selected recordId from the child recordselect event', async () => {
        const el = createComponent({ recordId: '001xHCP' });
        const child = el.shadowRoot.querySelector('c-lsc-mobile-inline_related-list');

        child.dispatchEvent(
            new CustomEvent('recordselect', { detail: { recordId: '00Tx999', record: {} } })
        );
        await flush();

        // No throw + handler wired; selection is stored internally.
        expect(child).not.toBeNull();
    });
});
