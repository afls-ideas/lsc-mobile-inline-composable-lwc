import { createElement } from 'lwc';
import LscMobileInlineInquiries from 'c/lscMobileInline_inquiries';

function createComponent(props = {}) {
    const el = createElement('c-lsc-mobile-inline_inquiries', {
        is: LscMobileInlineInquiries
    });
    Object.assign(el, props);
    document.body.appendChild(el);
    return el;
}

// A getRelatedListRecords-shaped Case record.
function caseRecord(status) {
    return { id: `500x${status}`, fields: { Status: { value: status } } };
}

async function flush() {
    return Promise.resolve();
}

describe('c-lsc-mobile-inline_inquiries', () => {
    afterEach(() => {
        while (document.body.firstChild) {
            document.body.removeChild(document.body.firstChild);
        }
    });

    it('configures the reusable brick to query Cases', () => {
        const el = createComponent({ recordId: '001xHCP' });

        const child = el.shadowRoot.querySelector('c-lsc-mobile-inline_related-list');
        expect(child).not.toBeNull();
        expect(child.relatedListId).toBe('Cases');
        expect(child.parentRecordId).toBe('001xHCP');
        expect(child.titleField).toBe('Case.Subject');
        expect(child.badgeField).toBe('Case.Status');
    });

    it('shows the escalation alert when an escalated case is present', async () => {
        const el = createComponent({ recordId: '001xHCP' });
        const child = el.shadowRoot.querySelector('c-lsc-mobile-inline_related-list');

        child.dispatchEvent(
            new CustomEvent('dataloaded', {
                detail: {
                    records: [caseRecord('New'), caseRecord('Escalated'), caseRecord('Working')],
                    count: 3
                }
            })
        );
        await flush();

        const alert = el.shadowRoot.querySelector('.slds-theme_warning');
        expect(alert).not.toBeNull();
        expect(alert.textContent).toContain('1 escalated inquiry(ies)');
    });

    it('hides the escalation alert when nothing is escalated', async () => {
        const el = createComponent({ recordId: '001xHCP' });
        const child = el.shadowRoot.querySelector('c-lsc-mobile-inline_related-list');

        child.dispatchEvent(
            new CustomEvent('dataloaded', {
                detail: { records: [caseRecord('New'), caseRecord('Working')], count: 2 }
            })
        );
        await flush();

        expect(el.shadowRoot.querySelector('.slds-theme_warning')).toBeNull();
    });
});
