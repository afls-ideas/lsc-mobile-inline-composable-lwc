import { createElement } from 'lwc';
import LscMobileInlineRelatedList from 'c/lscMobileInline_relatedList';
import { getRelatedListRecords } from 'lightning/uiRelatedListApi';

// Build a getRelatedListRecords-shaped record: values live at fields.<Api>.value
function record(id, fields) {
    const shaped = {};
    Object.keys(fields).forEach((key) => {
        shaped[key] = { value: fields[key], displayValue: null };
    });
    return { id, fields: shaped };
}

function createComponent(props = {}) {
    const el = createElement('c-lsc-mobile-inline_related-list', {
        is: LscMobileInlineRelatedList
    });
    Object.assign(el, props);
    document.body.appendChild(el);
    return el;
}

// Flush the microtask queue so wire + rerender settle.
async function flush() {
    return Promise.resolve();
}

describe('c-lsc-mobile-inline_related-list', () => {
    afterEach(() => {
        while (document.body.firstChild) {
            document.body.removeChild(document.body.firstChild);
        }
        jest.clearAllMocks();
    });

    it('renders a row per record using the configured fields', async () => {
        const el = createComponent({
            titleField: 'Case.Subject',
            subtitleField: 'Case.CaseNumber',
            badgeField: 'Case.Status'
        });

        getRelatedListRecords.emit({
            records: [
                record('500x1', { Subject: 'Dosing question', CaseNumber: '00001', Status: 'New' }),
                record('500x2', { Subject: 'Adverse event', CaseNumber: '00002', Status: 'Escalated' })
            ]
        });
        await flush();

        const rows = el.shadowRoot.querySelectorAll('li.row');
        expect(rows).toHaveLength(2);
        expect(rows[0].querySelector('.row__title').textContent).toBe('Dosing question');
        expect(rows[0].querySelector('.row__subtitle').textContent).toBe('00001');
        expect(rows[0].querySelector('.row__badge').textContent).toBe('New');
    });

    it('shows the count in the card title once loaded', async () => {
        const el = createComponent({ title: 'Medical Inquiries', titleField: 'Case.Subject' });

        getRelatedListRecords.emit({
            records: [record('500x1', { Subject: 'Q1' })]
        });
        await flush();

        const card = el.shadowRoot.querySelector('lightning-card');
        expect(card.title).toBe('Medical Inquiries (1)');
    });

    it('dispatches dataloaded with the raw records and count', async () => {
        const el = createComponent({ titleField: 'Task.Subject' });
        const handler = jest.fn();
        el.addEventListener('dataloaded', handler);

        getRelatedListRecords.emit({
            records: [
                record('00Tx1', { Subject: 'Call' }),
                record('00Tx2', { Subject: 'Email' })
            ]
        });
        await flush();

        expect(handler).toHaveBeenCalledTimes(1);
        const { detail } = handler.mock.calls[0][0];
        expect(detail.count).toBe(2);
        expect(detail.records).toHaveLength(2);
    });

    it('dispatches recordselect with the tapped record id', async () => {
        const el = createComponent({ titleField: 'Case.Subject' });
        const handler = jest.fn();
        el.addEventListener('recordselect', handler);

        getRelatedListRecords.emit({
            records: [record('500xABC', { Subject: 'Interaction query' })]
        });
        await flush();

        el.shadowRoot.querySelector('li.row').click();

        expect(handler).toHaveBeenCalledTimes(1);
        expect(handler.mock.calls[0][0].detail.recordId).toBe('500xABC');
    });

    it('renders an empty state when there are no records', async () => {
        const el = createComponent({ titleField: 'Case.Subject' });

        getRelatedListRecords.emit({ records: [] });
        await flush();

        expect(el.shadowRoot.querySelectorAll('li.row')).toHaveLength(0);
        expect(el.shadowRoot.textContent).toContain('No records found.');
    });

    it('renders an error message when the wire errors', async () => {
        const el = createComponent({ titleField: 'Case.Subject' });

        getRelatedListRecords.emitError({ body: { message: 'Related list not found' } });
        await flush();

        expect(el.shadowRoot.querySelector('.slds-text-color_error').textContent).toContain(
            'Related list not found'
        );
    });
});
