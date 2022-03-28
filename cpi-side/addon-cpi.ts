import '@pepperi-addons/cpi-node'

export async function load(configuration: any) {
    console.log('udc cpi side works!');
    // Put your cpi side code here

    pepperi.events.intercept('PreLoadTransactionScope', undefined, async (data, next, main) => {
        console.log('PreloadTransactionScope inside UDC. data is:', data);
    })
}