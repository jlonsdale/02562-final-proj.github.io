window.onload = function () {
  main();
};

let scrollValue = 3;
let theta = 0.2;
const minscrollValue = 3;
const maxscrollValue = 100;

async function main() {
  // Event Listeners

  const handleScroll = (event) => {
    scrollValue = Math.max(
      minscrollValue,
      Math.min(maxscrollValue, scrollValue + (event.deltaY < 0 ? -0.05 : 0.05))
    );
  };

  window.addEventListener("wheel", handleScroll);

  const gpu = navigator.gpu;
  const adapter = await gpu.requestAdapter();
  const device = await adapter.requestDevice();
  const canvas = document.getElementById("c");

  const context =
    canvas.getContext("gpupresent") || canvas.getContext("webgpu");
  const canvasFormat = navigator.gpu.getPreferredCanvasFormat();
  context.configure({
    device: device,
    format: canvasFormat,
  });
  const wgsl = device.createShaderModule({
    code: document.getElementById("wgsl").text,
  });

  const pipeline = device.createRenderPipeline({
    layout: "auto",
    vertex: {
      module: wgsl,
      entryPoint: "main_vs",
    },
    fragment: {
      module: wgsl,
      entryPoint: "main_fs",
      targets: [{ format: canvasFormat }],
    },
    primitive: {
      topology: "triangle-strip",
    },
  });

  const render = async () => {
    theta += 0.01;
    let funiforms = new Float32Array([scrollValue, theta]);

    const f_uniformBuffer = await device.createBuffer({
      size: funiforms.byteLength,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    device.queue.writeBuffer(f_uniformBuffer, 0, funiforms);

    const bindGroup = device.createBindGroup({
      layout: pipeline.getBindGroupLayout(0),
      entries: [{ binding: 0, resource: { buffer: f_uniformBuffer } }],
    });

    const encoder = device.createCommandEncoder();
    const pass = encoder.beginRenderPass({
      colorAttachments: [
        {
          view: context.getCurrentTexture().createView(),
          loadOp: "clear",
          storeOp: "store",
        },
      ],
    });
    pass.setPipeline(pipeline);
    pass.setBindGroup(0, bindGroup);
    pass.draw(4);
    pass.end();

    device.queue.submit([encoder.finish()]);
    requestAnimationFrame(render);
  };
  requestAnimationFrame(render);
}
