import { createElement } from 'lwc';
import LscMobileInlineRelatedList from 'c/lscMobileInline_relatedList';
import { graphql } from 'lightning/uiGraphQLApi';

// Build a GraphQL-shaped child node: values live at <Api>.value/.displayValue.
function gqlRecord(id, fields) {
    const node = { Id: id };
    Object.keys(fields).forEach((key) => {
        node[key] = { value: fields[key], displayValue: null };
    });
    return node;
}

// Build a uiapi GraphQL response nesting child nodes under
// query.<parentObjectApiName>.edges[0].node.<relatedListId>.edges[].node.
function gqlResponse(parentObjectApiName, relatedListId, nodes) {
    return {
        uiapi: {
            query: {
                [parentObjectApiName]: {
                    edges: [
                        {
                            node: {
                                Id: 'parent-id',
                                [relatedListId]: {
                                    edges: nodes.map((node) => ({ node }))
                                }
                            }
                        }
                    ]
                }
            }
        }
    };
}

// The real graphql wire adapter emits { data, errors } (errors plural).
function emitData(data) {
    graphql.emit({ data, errors: undefined });
}
function emitErrors(message) {
    graphql.emit({ data: undefined, errors: [{ message }] });
}

function createComponent(props = {}) {
    const el = createElement('c-lsc-mobile-inline_related-list', {
        is: LscMobileInlineRelatedList
    });
    Object.assign(el, { parentRecordId: '001x1', parentObjectApiName: 'Account', relatedListId: 'Cases' }, props);
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
            relatedListId: 'Cases',
            titleField: 'Case.Subject',
            subtitleField: 'Case.CaseNumber',
            badgeField: 'Case.Status'
        });
        await flush();

        emitData(
            gqlResponse('Account', 'Cases', [
                gqlRecord('500x1', { Subject: 'Dosing question', CaseNumber: '00001', Status: 'New' }),
                gqlRecord('500x2', { Subject: 'Adverse event', CaseNumber: '00002', Status: 'Escalated' })
            ])
        );
        await flush();

        const rows = el.shadowRoot.querySelectorAll('li.row');
        expect(rows).toHaveLength(2);
        expect(rows[0].querySelector('.row__title').textContent).toBe('Dosing question');
        expect(rows[0].querySelector('.row__subtitle').textContent).toBe('00001');
        expect(rows[0].querySelector('.row__badge').textContent).toBe('New');
    });

    it('shows the count in the card title once loaded', async () => {
        const el = createComponent({ relatedListId: 'Cases', title: 'Medical Inquiries', titleField: 'Case.Subject' });
        await flush();

        emitData(gqlResponse('Account', 'Cases', [gqlRecord('500x1', { Subject: 'Q1' })]));
        await flush();

        const card = el.shadowRoot.querySelector('lightning-card');
        expect(card.title).toBe('Medical Inquiries (1)');
    });

    it('dispatches dataloaded with the raw records and count', async () => {
        const el = createComponent({ relatedListId: 'Visits', titleField: 'Visit.Name' });
        const handler = jest.fn();
        el.addEventListener('dataloaded', handler);
        await flush();

        emitData(
            gqlResponse('Account', 'Visits', [
                gqlRecord('0aVx1', { Name: 'Call' }),
                gqlRecord('0aVx2', { Name: 'Email' })
            ])
        );
        await flush();

        expect(handler).toHaveBeenCalledTimes(1);
        const { detail } = handler.mock.calls[0][0];
        expect(detail.count).toBe(2);
        expect(detail.records).toHaveLength(2);
    });

    it('dispatches recordselect with the tapped record id', async () => {
        const el = createComponent({ relatedListId: 'Cases', titleField: 'Case.Subject' });
        const handler = jest.fn();
        el.addEventListener('recordselect', handler);
        await flush();

        emitData(gqlResponse('Account', 'Cases', [gqlRecord('500xABC', { Subject: 'Interaction query' })]));
        await flush();

        el.shadowRoot.querySelector('li.row').click();

        expect(handler).toHaveBeenCalledTimes(1);
        expect(handler.mock.calls[0][0].detail.recordId).toBe('500xABC');
    });

    it('renders an empty state when there are no records', async () => {
        const el = createComponent({ relatedListId: 'Cases', titleField: 'Case.Subject' });
        await flush();

        emitData(gqlResponse('Account', 'Cases', []));
        await flush();

        expect(el.shadowRoot.querySelectorAll('li.row')).toHaveLength(0);
        expect(el.shadowRoot.textContent).toContain('No records found.');
    });

    it('renders an error message when the wire errors', async () => {
        const el = createComponent({ relatedListId: 'Cases', titleField: 'Case.Subject' });
        await flush();

        emitErrors('Related list not found');
        await flush();

        expect(el.shadowRoot.querySelector('.slds-text-color_error').textContent).toContain(
            'Related list not found'
        );
    });
});
